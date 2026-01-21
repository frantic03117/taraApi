const { Schema, model } = require("mongoose");

const schema = new Schema(
    {
        currency: {
            type: String,
            required: true,
            uppercase: true,
            unique: true,
            trim: true
        },
        rate: {
            type: Number,
            required: true
        }
    },
    { timestamps: true }
);

module.exports = model("ConversionRate", schema);
