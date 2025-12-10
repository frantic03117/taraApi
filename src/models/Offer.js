const { Schema, Types, model } = require("mongoose");

const offer_schema = new Schema({
    offer_banner: String,
    offer_type: String,
    offer_id: String,
    category: {
        type: Types.ObjectId,
        ref: "Setting",
        default: null
    },
    sub_category: {
        type: Types.ObjectId,
        ref: "Setting",
        default: null
    },
    product: {
        type: Types.ObjectId,
        ref: "Product",
        default: null
    },
    variant: {
        type: Types.ObjectId,
        ref: "Variant",
        default: null
    },
    user: {
        type: Types.ObjectId,
        default: null
    },
    discount: Number,
    max_discount: Number,
    max_use: {
        type: Number,
        default: 100000000
    },
    start_date: Date,
    end_date: Date,
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = new model('offer', offer_schema);