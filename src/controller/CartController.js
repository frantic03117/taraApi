const mongoose = require("mongoose");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const Variant = require("../models/Variant");
const Offer = require("../models/Offer");
exports.add_to_cart = async (req, res) => {
    // await Cart.deleteMany({})
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user?._id || null;
        const { product, variant, quantity = 1, size } = req.body;
        const cart_token = req.headers["cart-token"];
        if (!product || !variant) {
            return res.status(400).json({ success: 0, message: "Product & Variant required" });
        }

        if (!userId && !cart_token) {
            return res.status(400).json({ success: 0, message: "Cart token required" });
        }

        /* ---------- Validate Product ---------- */
        const productData = await Product.findOne({
            _id: product,
            is_active: true,
            is_deleted: false
        });

        if (!productData) {
            return res.status(404).json({ success: 0, message: "Product unavailable" });
        }

        /* ---------- TRANSACTION STOCK LOCK ---------- */
        const variantData = await Variant.findOneAndUpdate(
            {
                _id: variant,
                product,
                is_active: true,
                is_deleted: false,
                in_stock: true,
                // stock: { $gte: quantity }
            },
            {
                // $inc: { stock: -quantity }
            },
            { new: true, session }
        );

        if (!variantData) {
            throw new Error("Variant out of stock");
        }

        const cartQuery = {
            product,
            variant,
            size,
            is_ordered: false,
            ...(userId ? { user: userId } : { cart_token })
        };

        let cartItem = await Cart.findOne(cartQuery).session(session);

        if (cartItem) {
            cartItem.quantity += quantity;
            cartItem.price = variantData.sale_price || variantData.price;
            await cartItem.save({ session });
        } else {
            cartItem = await Cart.create([{
                user: userId,
                cart_token,
                product,
                variant,
                quantity,
                size,
                price: variantData.sale_price || variantData.price
            }], { session });
        }

        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: 1,
            message: "Added to cart",
            data: cartItem
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        return res.status(500).json({
            success: 0,
            message: error.message
        });
    }
};
exports.merge_guest_cart = async (req, res) => {
    try {
        const userId = req.user._id;
        const cartToken = req.headers["cart-token"];

        if (!cartToken) {
            return res.json({ success: 1, message: "No guest cart" });
        }

        const guestItems = await Cart.find({
            cart_token: cartToken,
            is_ordered: false
        });

        for (const item of guestItems) {
            const existing = await Cart.findOne({
                user: userId,
                variant: item.variant,
                is_ordered: false
            });

            const variant = await Variant.findById(item.variant);
            if (!variant || !variant.is_active || !variant.in_stock) {
                await Cart.deleteOne({ _id: item._id });
                continue;
            }

            if (existing) {
                const totalQty = existing.quantity + item.quantity;

                if (variant.stock + existing.quantity < totalQty) {
                    continue; // skip if insufficient stock
                }

                existing.quantity = totalQty;
                await existing.save();
                await Cart.deleteOne({ _id: item._id });

            } else {
                item.user = userId;
                item.cart_token = null;
                await item.save();
            }
        }

        return res.json({
            success: 1,
            message: "Guest cart merged successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: 0,
            message: error.message
        });
    }
};
exports.remove_from_cart = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const userId = req.user?._id || null;
        const cart_token = req.headers["cart-token"] || null;
        const { cart_id } = req.params;

        if (!cart_id) {
            return res.status(400).json({
                success: 0,
                message: "Cart ID is required"
            });
        }

        /* ---------- Find Cart Item ---------- */
        const cartItem = await Cart.findOne({
            _id: cart_id,
            is_ordered: false,
            ...(userId ? { user: userId } : { cart_token })
        }).session(session);

        if (!cartItem) {
            throw new Error("Cart item not found");
        }

        /* ---------- Restore Stock ---------- */
        await Variant.findOneAndUpdate(
            { _id: cartItem.variant },
            { $inc: { stock: cartItem.quantity } },
            { session }
        );

        /* ---------- Remove Cart Item ---------- */
        await Cart.deleteOne({ _id: cart_id }).session(session);

        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: 1,
            message: "Item removed & stock restored"
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        return res.status(500).json({
            success: 0,
            message: error.message
        });
    }
};
exports.get_cart_items = async (req, res) => {
    try {
        const userId = req.user?._id || null;
        const cartToken = req.headers["cart-token"] || null;

        if (!userId && !cartToken) {
            return res.status(400).json({
                success: 0,
                message: "User or cart token required"
            });
        }

        const filter = {
            is_ordered: false
        };

        if (userId) filter.user = userId;
        else filter.cart_token = cartToken;

        const items = await Cart.find(filter)
            .populate({
                path: "product",
                select: "title images is_active"
            })
            .populate({
                path: "variant",
                select: "sku price sale_price  in_stock is_active images size size_group color"
            })
            .sort({ createdAt: -1 });

        // Remove invalid items (inactive / out of stock)
        const validItems = [];
        let subtotal = 0;

        for (const item of items) {
            if (
                !item.variant ||
                !item.variant.is_active ||
                !item.variant.in_stock
            ) {
                // restore stock
                await Variant.updateOne(
                    { _id: item.variant },
                    { $inc: { stock: item.quantity } }
                );
                await Cart.deleteOne({ _id: item._id });
                continue;
            }

            const price = item.variant.sale_price || item.variant.price;
            const total = price * item.quantity;

            subtotal += total;

            validItems.push({
                _id: item._id,
                product: item.product,
                variant: item.variant,
                quantity: item.quantity,
                currency: item.currency,
                price,
                total,
                size: item.size,
                stock_locked_at: item.stock_locked_at
            });
        }

        return res.json({
            success: 1,
            data: {
                items: validItems,
                summary: {
                    subtotal,
                    item_count: validItems.length,
                    currency: validItems[0]?.currency
                }
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: 0,
            message: error.message
        });
    }
};
exports.update_cart_quantity = async (req, res) => {
    try {
        const { cart_id } = req.params;
        const { quantity, size } = req.body;
        const userId = req.user?._id || null;
        const cartToken = req.headers["cart-token"] || null;

        if (!cart_id) {
            return res.status(400).json({
                success: 0,
                message: "Cart ID  required"
            });
        }

        const cartItem = await Cart.findOne({
            _id: cart_id,
            is_ordered: false,
            ...(userId ? { user: userId } : { cart_token: cartToken })
        }).populate("variant");

        if (!cartItem || !cartItem.variant) {
            return res.status(404).json({
                success: 0,
                message: "Cart item not found"
            });
        }

        const variant = cartItem.variant;

        if (!variant.is_active || !variant.in_stock) {
            return res.status(400).json({
                success: 0,
                message: "Variant unavailable"
            });
        }
        if (quantity) {


            const oldQty = cartItem.quantity;
            const diff = quantity - oldQty;

            // ❌ Remove item
            if (quantity <= 0) {
                await Variant.updateOne(
                    { _id: variant._id },
                    { $inc: { stock: oldQty } }
                );
                await Cart.deleteOne({ _id: cart_id });

                return res.json({
                    success: 1,
                    message: "Item removed from cart"
                });
            }

            // ➕ Increase quantity
            if (diff > 0) {
                if (variant.stock < diff) {
                    return res.status(400).json({
                        success: 0,
                        message: "Insufficient stock"
                    });
                }

                await Variant.updateOne(
                    { _id: variant._id },
                    { $inc: { stock: -diff } }
                );
            }

            // ➖ Decrease quantity
            if (diff < 0) {
                await Variant.updateOne(
                    { _id: variant._id },
                    { $inc: { stock: Math.abs(diff) } }
                );
            }

            cartItem.quantity = quantity;
        }
        if (size) {
            cartItem.size = size;
        }
        await cartItem.save();

        return res.json({
            success: 1,
            message: "Cart updated",
            data: cartItem
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: 0,
            message: error.message
        });
    }
};
exports.apply_offer = async (req, res) => {
    try {
        const userId = req.user?._id || null;
        const cartToken = req.headers["cart-token"];
        const { offer_id } = req.body;

        const offer = await Offer.findById(offer_id);
        if (!offer) {
            return res.status(404).json({ success: 0, message: "Invalid offer" });
        }

        const now = new Date();
        if (now < offer.start_date || now > offer.end_date) {
            return res.status(400).json({ success: 0, message: "Offer expired" });
        }

        const cartItems = await Cart.find({
            is_ordered: false,
            ...(userId ? { user: userId } : { cart_token: cartToken })
        }).populate("product variant");

        let totalDiscount = 0;

        for (const item of cartItems) {
            let eligible = false;

            switch (offer.offer_type) {
                case "category":
                    eligible = item.product.category?.equals(offer.category);
                    break;
                case "Sub Category":
                    eligible = item.product.sub_category?.equals(offer.sub_category);
                    break;
                case "Product":
                    eligible = item.product._id.equals(offer.product);
                    break;
                case "Variant":
                    eligible = item.variant._id.equals(offer.variant);
                    break;
            }

            if (!eligible) continue;

            const price = item.variant.sale_price || item.variant.price;
            const discount = (price * offer.discount) / 100 * item.quantity;

            totalDiscount += discount;
        }

        if (offer.max_discount && totalDiscount > offer.max_discount) {
            totalDiscount = offer.max_discount;
        }

        return res.json({
            success: 1,
            data: {
                offer_id,
                discount: Math.round(totalDiscount)
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: 0,
            message: error.message
        });
    }
};
exports.add_multi_items_to_cart = async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const userId = req.user?._id || null;
        const cart_token = req.headers["cart-token"];
        const { variants } = req.body;

        if (!Array.isArray(variants) || variants.length === 0) {
            return res.status(400).json({
                success: 0,
                message: "Variants array required"
            });
        }

        if (!userId && !cart_token) {
            return res.status(400).json({
                success: 0,
                message: "Cart token required"
            });
        }

        const addedItems = [];

        for (const item of variants) {
            const { product, variant, quantity = 1, size } = item;

            if (!product || !variant) {
                throw new Error("Product & Variant required");
            }

            /* ---------- Validate Product ---------- */
            const productData = await Product.findOne({
                _id: product,
                is_active: true,
                is_deleted: false
            }).session(session);

            if (!productData) {
                throw new Error("Product unavailable");
            }

            /* ---------- Validate Variant ---------- */
            const variantData = await Variant.findOne({
                _id: variant,
                product,
                is_active: true,
                is_deleted: false,
                in_stock: true
            }).session(session);

            if (!variantData) {
                throw new Error("Variant unavailable");
            }

            const cartQuery = {
                product,
                variant,
                size,
                is_ordered: false,
                ...(userId ? { user: userId } : { cart_token })
            };

            let cartItem = await Cart.findOne(cartQuery).session(session);

            if (cartItem) {
                cartItem.quantity += quantity;
                cartItem.price = variantData.sale_price || variantData.price;
                await cartItem.save({ session });
            } else {
                const [newItem] = await Cart.create([{
                    user: userId,
                    cart_token,
                    product,
                    variant,
                    quantity,
                    size,
                    price: variantData.sale_price || variantData.price
                }], { session });

                cartItem = newItem;
            }

            addedItems.push(cartItem);
        }

        await session.commitTransaction();
        session.endSession();

        return res.json({
            success: 1,
            message: "Items added to cart",
            data: addedItems
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        return res.status(500).json({
            success: 0,
            message: error.message
        });
    }
};
