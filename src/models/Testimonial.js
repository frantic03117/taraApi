const { Schema, Types, model } = require("mongoose");

const testimonialSchema = new Schema({
    type: {
        type: String,
        default: "testimonial"
    },
    user: {
        type: Types.ObjectId,
        ref: "User",
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
    name: String,
    sub_label: String,
    sub_title: String,
    file: String,
    file_type: String,
    description: String,
    isActive: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });
module.exports = new model('Testimonial', testimonialSchema);