const { Schema, Types, model } = require("mongoose");

const gstSchema = new Schema({

    user: {
        type: Types.ObjectId,
        ref: "User",
        default: null
    },

    gst_number: {
        type: String,
        default: null,
        uppercase: true,
        unique: true
    },

    company_name: {
        type: String,
        default: null
    },

    company_address: {
        type: String,
        default: null
    },

    state: {
        type: String,
        default: null
    },

    pincode: {
        type: String,
        default: null
    },

    is_default: {
        type: Boolean,
        default: false
    },

    is_verified: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

module.exports = model("GST", gstSchema);
