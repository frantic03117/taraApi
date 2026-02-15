const { Schema, model } = require("mongoose");

const schema = new Schema({
    title: {
        type: String,
        required: true
    },
    slug: {
        type: String,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        default: ""
    },
    heading: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = model('Section', schema);
