
const mongoose = require("mongoose");
const Voucher = require("../models/Voucher");
const Cart = require("../models/Cart");
const { validatePromo } = require("../services/promo.service");

// Helper to handle errors
const handleError = (res, error, status = 400) => {
    return res.status(status).json({
        success: 0,
        message: error.message || "Something went wrong",
        errors: error.errors || null,
    });
};

// 📌 Create Voucher
exports.createVoucher = async (req, res) => {
    try {
        if (req.user.role != "Admin") {
            return resstatus(400).json({ success: 0 });
        }
        const { code, uses_count_per_user, discount_type, discount, discount_max_cap, valid_from, valid_to, user } = req.body;

        // Basic validations
        if (!code) return res.status(400).json({ success: 0, message: "Code is required" });
        if (!discount_max_cap) return res.status(400).json({ success: 0, message: "discount_max_cap is required" });
        if (!discount_type) return res.status(400).json({ success: 0, message: "Discount type is required" });
        if (!discount) return res.status(400).json({ success: 0, message: "Discount value is required" });
        if (!valid_from || !valid_to) return res.status(400).json({ success: 0, message: "Valid from & valid to dates are required" });

        if (new Date(valid_from) > new Date(valid_to)) {
            return res.status(400).json({ success: 0, message: "valid_from cannot be later than valid_to" });
        }

        const voucher = new Voucher({
            code,
            uses_count_per_user,
            discount_type,
            discount,
            discount_max_cap,
            valid_from,
            valid_to,
            user: user || null,
        });

        await voucher.save();
        return res.status(201).json({ success: 1, message: "Voucher created successfully", data: voucher });
    } catch (error) {
        return handleError(res, error, 500);
    }
};

// 📌 Get All Vouchers
exports.getVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find().populate("therapist", "name email");
        return res.json({ success: 1, data: vouchers });
    } catch (error) {
        return handleError(res, error, 500);
    }
};

// 📌 Get Single Voucher
exports.getVoucher = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: 0, message: "Invalid ID" });
        }

        const voucher = await Voucher.findById(req.params.id).populate("therapist", "name email");
        if (!voucher) return res.status(404).json({ success: 0, message: "Voucher not found" });

        return res.json({ success: 1, data: voucher });
    } catch (error) {
        return handleError(res, error, 500);
    }
};

// 📌 Update Voucher
exports.updateVoucher = async (req, res) => {
    try {
        if (req.user.role != "Admin") {
            return resstatus(400).json({ success: 0 });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: 0, message: "Invalid ID" });
        }

        const { valid_from, valid_to } = req.body;
        if (valid_from && valid_to && new Date(valid_from) > new Date(valid_to)) {
            return res.status(400).json({ success: 0, message: "valid_from cannot be later than valid_to" });
        }

        const voucher = await Voucher.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
        if (!voucher) return res.status(404).json({ success: 0, message: "Voucher not found" });

        return res.json({ success: 1, message: "Voucher updated successfully", data: voucher });
    } catch (error) {
        return handleError(res, error, 500);
    }
};

// 📌 Delete Voucher
exports.deleteVoucher = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: 0, message: "Invalid ID" });
        }

        const voucher = await Voucher.findByIdAndDelete(req.params.id);
        if (!voucher) return res.status(404).json({ success: 0, message: "Voucher not found" });

        return res.json({ success: 1, message: "Voucher deleted successfully" });
    } catch (error) {
        return handleError(res, error, 500);
    }
};

exports.updateActivation = async (req, res) => {
    try {
        const { id } = req.params;


        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: 0, message: "Invalid ID" });
        }


        const voucher = await Voucher.findById(id);
        if (!voucher) {
            return res.status(404).json({ success: 0, message: "Voucher not found" });
        }

        voucher.is_active = !voucher.is_active;
        await voucher.save();

        return res.json({
            success: 1,
            message: `Voucher ${voucher.is_active ? "enabled" : "disabled"} successfully`,
            data: voucher,
        });
    } catch (error) {
        return handleError(res, error, 500);
    }
};
exports.applyVoucher = async (req, res) => {
    try {
        const session = await mongoose.startSession();
        session.startTransaction();
        const userId = req.user?._id;
        const cart_token = req.headers["cart-token"];
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                message: "Voucher code is required"
            });
        }
        /* 4️⃣ Fetch cart */
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

        const promo = await validatePromo({
            code: code,
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
        return res.json({
            success: 1,
            message: "Promo applied successfully",
            data: promo.promo_data
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
