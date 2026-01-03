const { Schema, Types, model } = require("mongoose");

const vschema = new Schema({
    code: String,
    uses_count_per_user: {
        type: Number,
        default: 1
    },
    discount_type: {
        type: String,
        enum: ['Fixed', 'Percent']
    },
    min_cart_amount: Number,
    discount: Number,
    discount_max_cap: Number,
    valid_from: Date,
    valid_to: Date,
    is_active: {
        type: Boolean,
        default: true
    },
    user: {
        type: Types.ObjectId,
        ref: "Users",
        default: null
    },
}, { timestamps: true });

module.exports = new model('Voucher', vschema);