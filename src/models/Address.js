const { Schema, Types, model } = require("mongoose");

const addressSchema = new Schema({
    first_name: String,
    last_name: String,
    email: String,
    mobile: String,
    user: {
        type: Types.ObjectId,
        ref: "User",
        default: null    // guest checkout support
    },

    name: {
        type: String,
    },

    phone: {
        type: String,
    },

    alternate_phone: {
        type: String,
        default: null
    },

    address_line1: {
        type: String,
    },

    address_line2: {
        type: String,
        default: null
    },

    landmark: {
        type: String,
        default: null
    },

    town: {
        type: String,
    },

    state: {
        type: String,
    },

    country: {
        type: String,
        default: "India"
    },

    pincode: {
        type: String,
    },

    address_type: {
        type: String,
        enum: ["Home", "Office", "Other"],
        default: "Home"
    },

    is_default: {
        type: Boolean,
        default: false
    },

    is_active: {
        type: Boolean,
        default: true
    }

}, { timestamps: true });

module.exports = model("Address", addressSchema);
