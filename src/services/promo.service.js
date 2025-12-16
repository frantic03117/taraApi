const Voucher = require("../models/Voucher");
const Order = require("../models/Order");

/**
 * Validate & Calculate Promo Discount
 * @param {Object} params
 * @returns {Object}
 */
exports.validatePromo = async ({
    code,
    userId = null,
    cartAmount,
    session = null
}) => {

    if (!code) {
        return { valid: false, message: "Promo code missing" };
    }

    const now = new Date();

    const voucher = await Voucher.findOne({
        code,
        is_active: true,
        valid_from: { $lte: now },
        valid_to: { $gte: now },
        min_cart_amount: { $lte: cartAmount }
    }).session(session);

    if (!voucher) {
        return {
            valid: false,
            message: "Invalid or expired promo code"
        };
    }

    /* --------------------------------
       Per User Usage Limit
    --------------------------------- */
    if (userId) {
        const usedCount = await Order.countDocuments({
            user: userId,
            "promo_code.code": voucher.code
        }).session(session);

        if (usedCount >= voucher.uses_count_per_user) {
            return {
                valid: false,
                message: "Promo usage limit exceeded"
            };
        }
    }

    /* --------------------------------
       Discount Calculation
    --------------------------------- */
    let discount = 0;

    if (voucher.discount_type === "Percent") {
        discount = (cartAmount * voucher.discount) / 100;

        if (voucher.discount_max_cap) {
            discount = Math.min(discount, voucher.discount_max_cap);
        }
    } else {
        discount = voucher.discount;
    }

    return {
        valid: true,
        voucher,
        discount,
        promo_data: {
            code: voucher.code,
            type: voucher.discount_type,
            value: voucher.discount,
            discount_applied: discount
        }
    };
};
