const { Schema, default: mongoose } = require("mongoose");
const otpschema = new Schema({
    email: {
        type: String,
        trim: true,
        lowercase: true,
    },
    country_code: {
        type: String
    },
    mobile: {
        type: String,
        default: null
    },
    otp: {
        type: Number,
    },
    is_verified: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });
module.exports = new mongoose.model('Otp', otpschema);