const { Schema, Types, model } = require("mongoose");

const orderSchema = new Schema({

    /* ───────── BASIC ORDER INFO ───────── */
    order_id: {
        type: String,
        required: true,
        unique: true
    },

    user: {
        type: Types.ObjectId,
        ref: "User",
        default: null   // guest checkout support
    },
    first_name: String,
    last_name: String,
    country_code: {
        type: String,
        default: "+91"
    },
    mobile: String,
    email: String,

    cart_ids: [
        {
            type: Types.ObjectId,
            ref: "Cart",
            required: true
        }
    ],

    /* ───────── ADDRESS & SHIPPING ───────── */
    address: {
        type: Types.ObjectId,
        ref: "Address",
        required: true
    },

    shipping_method: {
        type: String,
        default: "Standard"
    },

    shipping_charge: {
        type: Number,
        default: 0
    },

    /* ───────── PRICING BREAKUP ───────── */
    subtotal: {
        type: Number,
        required: true
    },

    promo_code: {
        type: Schema.Types.Mixed,   // voucher snapshot
        default: null
    },

    promo_discount: {
        type: Number,
        default: 0
    },

    tax_amount: {
        type: Number,
        default: 0
    },

    total_amount: {
        type: Number,
        required: true
    },

    currency: {
        type: String,
        default: "₹"
    },

    /* ───────── PAYMENT INFO ───────── */
    payment_method: {
        type: String,
        enum: ["COD", "ONLINE", "WALLET"],
        required: true
    },

    payment_status: {
        type: String,
        enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
        default: "PENDING"
    },

    payment_id: {
        type: String,
        default: null
    },

    payment_gateway: {
        type: String,
        default: null
    },

    paid_at: {
        type: Date,
        default: null
    },

    /* ───────── ORDER STATUS ───────── */
    order_status: {
        type: String,
        enum: [
            "PENDING",
            "PLACED",
            "CONFIRMED",
            "PACKED",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
            "RETURNED"
        ],
        default: "PENDING"
    },

    /* ───────── TRACKING ───────── */
    tracking_id: {
        type: String,
        default: null
    },

    courier_name: {
        type: String,
        default: null
    },

    shipped_at: {
        type: Date,
        default: null
    },

    delivered_at: {
        type: Date,
        default: null
    },

    /* ───────── CANCELLATION / REFUND ───────── */
    cancelled_at: {
        type: Date,
        default: null
    },

    cancel_reason: {
        type: String,
        default: null
    },

    refund_amount: {
        type: Number,
        default: 0
    },

    refund_id: {
        type: String,
        default: null
    },

    refunded_at: {
        type: Date,
        default: null
    },

    /* ───────── META ───────── */
    is_guest: {
        type: Boolean,
        default: false
    },

    notes: {
        type: String,
        default: null
    }

}, { timestamps: true });

module.exports = model("Order", orderSchema);
