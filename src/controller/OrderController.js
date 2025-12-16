const mongoose = require("mongoose");


const { validatePromo } = require("../services/promo.service");
const Address = require("../models/Address");
const GstModel = require("../models/Gst.model");
const Order = require("../models/Order");
const Cart = require("../models/Cart");

exports.create_order = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user?._id || null;
        const cart_token = req.headers["cart-token"];
        const { promo_code, address_data, gst_data = null } = req.body;
        const addressRequest = {
            ...address_data,
            user: userId,
        }
        const address_saved = await Address.create(addressRequest);
        const gstRequest = {
            ...gst_data,
            user: userId
        }
        let gst_saved = false;
        if (gst_data) {
            gst_saved = await GstModel.create(gstRequest);
        }


        if (!userId && !cart_token) {
            return res.status(400).json({
                success: 0,
                message: "Cart not found"
            });
        }

        /* --------------------------------
           Fetch Cart Items Securely
        --------------------------------- */
        const cartQuery = {
            is_ordered: false,
            ...(userId ? { user: userId } : { cart_token })
        };

        const carts = await Cart.find(cartQuery).session(session);

        if (!carts.length) {
            return res.status(400).json({
                success: 0,
                message: "Your cart is empty"
            });
        }

        /* --------------------------------
           Calculate Subtotal
        --------------------------------- */
        const subtotal = carts.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        let promo_discount = 0;
        let applied_promo = null;

        /* --------------------------------
           Validate Promo Code (Server)
        --------------------------------- */


        if (promo_code) {
            const promo = await validatePromo({
                code: promo_code,
                userId,
                cartAmount: subtotal,
                session
            });

            if (!promo.valid) {
                return res.status(400).json({
                    success: 0,
                    message: promo.message
                });
            }

            promo_discount = promo.discount;
            applied_promo = promo.promo_data;
        }

        /* --------------------------------
           Final Amount
        --------------------------------- */
        const total_amount = Math.max(subtotal - promo_discount, 0);

        /* --------------------------------
           Create Order
        --------------------------------- */
        const order = await Order.create([{
            order_id: "ORD-" + Date.now(),
            user: userId,
            cart_ids: carts.map(c => c._id),
            address: address_saved._id,
            gst: gst_data ? gst_saved?._id : null,
            total_amount,
            subtotal: subtotal,
            currency: carts[0].currency,
            promo_code: applied_promo,
            promo_discount,
            order_status: "PENDING",
            payment_status: "PENDING",
            payment_method: req.body.payment_method ?? "COD"
        }], { session });

        /* --------------------------------
           Lock Cart Items
        --------------------------------- */
        await Cart.updateMany(
            { _id: { $in: carts.map(c => c._id) } },
            {
                $set: {
                    is_ordered: true,
                    order: order[0]._id
                }
            },
            { session }
        );

        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: 1,
            message: "Order created successfully",
            data: order[0]
        });

    } catch (err) {
        await session.abortTransaction();
        session.endSession();

        return res.status(500).json({
            success: 0,
            message: err.message
        });
    }
};
