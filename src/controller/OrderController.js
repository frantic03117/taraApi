const mongoose = require("mongoose");


const { validatePromo } = require("../services/promo.service");
const Address = require("../models/Address");
const GstModel = require("../models/Gst.model");
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const UserModel = require('../models/Users');
const { CASHFREE_ENV, CASHFREE_URL_PRODUCTION, CASHFREE_URL_TEST, CASHFREE_APP_ID, CASHFREE_SECRET_KEY, FRONTEND_URL } = require("../contants");
const { createCashfreeOrder } = require("../services/cashfree.service");
const { registerGuestUser } = require("../services/user.service");
const { logCashfreeWebhook } = require("../services/webhookLogger");
const Product = require("../models/Product");
const BASE_URL = CASHFREE_ENV === "production" ? CASHFREE_URL_PRODUCTION : CASHFREE_URL_TEST;
exports.create_order = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user?._id || null;
        let user;
        const cart_token = req.headers["cart-token"];
        const { promo_code, address_data, gst_data = null } = req.body;
        if (!userId) {
            user = await registerGuestUser({ first_name: address_data.first_name, last_name: address_data.last_name, email: address_data.email, mobile: address_data.mobile, country_code: "+91" });
        } else {
            user = await UserModel.findOne({ _id: userId });
        }

        if (!user && !cart_token) {
            return res.status(400).json({
                success: 0,
                message: "Cart not found"
            });
        }
        const addressRequest = {
            ...address_data,
            user: user?._id,
        }
        const address_saved = await Address.create(addressRequest);
        const gstRequest = {
            ...gst_data,
            user: user?._id
        }
        let gst_saved = false;
        if (gst_data) {
            gst_saved = await GstModel.create(gstRequest);
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
                userId: user?._id,
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

        const orderObject = {
            order_id: "ORD-" + Date.now(),
            user: user?._id,
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
            payment_method: req.body.payment_method ?? "COD",
            first_name: address_data.first_name,
            last_name: address_data.last_name,
            mobile: address_data.mobile,
            email: address_data.email,
        };
        console.log(orderObject)
        const order = await Order.create([orderObject], { session });

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

        let customer = {
            customer_id: user._id,
            name: user.first_name + " " + user.last_name,
            phone: address_data?.mobile ?? "9084694815",
            email: address_data.email
        }
        console.log(customer)

        const cashfreeOrder = await createCashfreeOrder({
            order_id: order[0].order_id,
            amount: total_amount,
            customer: customer,
            return_url: `${FRONTEND_URL}/payment?order_id=${order[0].order_id}`
        });
        await Order.findOneAndUpdate({ _id: order[0]._id }, { $set: { order_id: order[0].order_id, payment_gateway: "cashfree", payment_request: JSON.stringify(cashfreeOrder), payment_session_id: cashfreeOrder?.payment_session_id } })
        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: 1,
            message: "Order created successfully",
            data: cashfreeOrder,

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

exports.verify_cashfree_order = async (req, res) => {
    try {
        const { orderId } = req.params;

        const response = await axios.get(
            `${BASE_URL}/orders/${orderId}`,
            {
                headers: {
                    "x-client-id": CASHFREE_APP_ID,
                    "x-client-secret": CASHFREE_SECRET_KEY,
                    "x-api-version": "2023-08-01"
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        res.status(500).json({
            error: error.response?.data || error.message
        });
    }
}
exports.cashfreeWebhook = async (req, res) => {
    try {
        const event = req.body;

        console.log("Cashfree Webhook:", JSON.stringify(event));
        logCashfreeWebhook(event);

        const orderId = event?.data?.order?.order_id;
        const payment = event?.data?.payment;

        if (!orderId || !payment) {
            return res.status(400).send("Invalid payload");
        }

        // ✅ PAYMENT SUCCESS
        if (event.type === "PAYMENT_SUCCESS_WEBHOOK") {
            await Order.findOneAndUpdate(
                { order_id: orderId },
                {
                    payment_method: "ONLINE",
                    payment_status: "PAID",
                    payment_id: payment.cf_payment_id,
                    payment_response: event,
                    paid_at: new Date(payment.payment_time),
                    order_status: "CONFIRMED"
                }
            );
        }

        // ❌ PAYMENT FAILED
        if (event.type === "PAYMENT_FAILED_WEBHOOK") {
            await Order.findOneAndUpdate(
                { order_id: orderId },
                {
                    payment_status: "FAILED",
                    order_status: "FAILED",
                    payment_response: event
                }
            );
        }

        return res.status(200).send("OK");
    } catch (err) {
        console.error("Webhook error:", err);
        return res.status(500).send("Webhook error");
    }
};

// exports.list_orders = async (req, res) => {
//     try {

//         console.log('user', req.user._id)
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 10;
//         const skip = (page - 1) * limit;

//         // Optional filters
//         const filter = {};

//         if (req.query.order_status) {
//             filter.order_status = req.query.order_status;
//         }

//         if (req.query.payment_status) {
//             filter.payment_status = req.query.payment_status;
//         }

//         if (req.query.search) {
//             filter.$or = [
//                 { order_id: { $regex: req.query.search, $options: "i" } },
//                 { email: { $regex: req.query.search, $options: "i" } },
//                 { mobile: { $regex: req.query.search, $options: "i" } }
//             ];
//         }
//         if (req.query.order_type) {
//             switch (req.query.order_type) {
//                 case 'placed':
//                     filter.order_status = 'PLACED';
//                     break;

//                 case 'confirmed':
//                     filter.order_status = 'CONFIRMED';
//                     filter.payment_status = 'PAID';
//                     break;

//                 case 'pending':
//                     filter.payment_status = 'PENDING';
//                     break;
//                 case 'shipped':
//                     filter.order_status = 'SHIPPED';
//                     break;

//                 case 'failed':
//                     filter.payment_status = 'FAILED';
//                     break;

//                 case 'delivered':
//                     filter.order_status = 'DELIVERED';
//                     break;

//                 case 'cancelled':
//                     filter.order_status = 'CANCELLED';
//                     break;

//                 default:
//                     // no filter applied if unknown value
//                     break;
//             }
//         }

//         const [orders, total] = await Promise.all([
//             Order.find(filter)
//                 .sort({ createdAt: -1 })
//                 .skip(skip)
//                 .limit(limit)
//                 .populate([
//                     {
//                         path: "cart_ids",
//                         populate: [
//                             {
//                                 path: "product",
//                                 populate: [
//                                     {
//                                         path: "category"
//                                     },
//                                     {
//                                         path: "sub_category"
//                                     },
//                                     {
//                                         path: "brand"
//                                     }
//                                 ]
//                             },
//                             {
//                                 path: "variant",
//                             }
//                         ]
//                     },
//                     {
//                         path: "address",
//                     }

//                 ])
//                 .lean(),

//             Order.countDocuments(filter)
//         ]);

//         res.json({
//             success: true,
//             data: orders,
//             pagination: {
//                 total,
//                 page,
//                 limit,
//                 totalPages: Math.ceil(total / limit)
//             }
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({
//             success: false,
//             message: "Failed to fetch orders"
//         });
//     }
// };




exports.list_orders = async (req, res) => {
    try {
        console.log("user", req.user?._id);

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // ✅ Optional filters
        const filter = {};

        // ✅ admin check
        const isAdminRequest = req.query.admin === "true";

        // ⚠️ Make sure user is actually admin (change according to your user schema)
        const isAdminUser = req.user?.role === "Admin" || req.user?.is_admin === true;

        // ✅ If not admin request OR not admin user → show only logged-in user's orders
        if (!(isAdminRequest && isAdminUser)) {
            filter.user = req.user._id;
        }

        if (req.query.order_status) {
            filter.order_status = req.query.order_status;
        }

        if (req.query.payment_status) {
            filter.payment_status = req.query.payment_status;
        }

        if (req.query.search) {
            filter.$or = [
                { order_id: { $regex: req.query.search, $options: "i" } },
                { email: { $regex: req.query.search, $options: "i" } },
                { mobile: { $regex: req.query.search, $options: "i" } },
            ];
        }

        if (req.query.order_type) {
            switch (req.query.order_type) {
                case "placed":
                    filter.order_status = "PLACED";
                    break;

                case "confirmed":
                    filter.order_status = "CONFIRMED";
                    filter.payment_status = "PAID";
                    break;

                case "pending":
                    filter.payment_status = "PENDING";
                    break;

                case "shipped":
                    filter.order_status = "SHIPPED";
                    break;

                case "failed":
                    filter.payment_status = "FAILED";
                    break;

                case "delivered":
                    filter.order_status = "DELIVERED";
                    break;

                case "cancelled":
                    filter.order_status = "CANCELLED";
                    break;

                default:
                    break;
            }
        }

        const [orders, total] = await Promise.all([
            Order.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate([
                    {
                        path: "cart_ids",
                        populate: [
                            {
                                path: "product",
                                populate: [{ path: "category" }, { path: "sub_category" }, { path: "brand" }],
                            },
                            { path: "variant" },
                        ],
                    },
                    { path: "address" },
                ])
                .lean(),
            Order.countDocuments(filter),
        ]);

        res.json({
            success: true,
            data: orders,
            filter,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch orders",
        });
    }
};

exports.fetch_single_order = async (req, res) => {
    const { order_id } = req.params;
    let filter = {};
    filter['order_id'] = order_id;
    const [orders, total] = await Promise.all([
        Order.find(filter)
            .sort({ createdAt: -1 })
            .limit(1)
            .populate([
                {
                    path: "cart_ids",
                    populate: [
                        {
                            path: "product",
                        },
                        {
                            path: "variant",
                        }
                    ]
                },
                {
                    path: "address",
                }

            ])
            .lean(),

        Order.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: orders[0],
        total
    });
}

exports.dashboard = async (req, res) => {
    try {
        const productCounts = await Product.countDocuments({});
        const orderCounts = await Order.countDocuments({});
        const resp = {
            productCounts,
            orderCounts
        }
        return res.json({ data: resp, success: 1 });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
}
