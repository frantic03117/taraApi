const { Schema, model } = require("mongoose");

const schema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },

}, { timestamps: true });
module.exports = model('EmailSubscription', schema);