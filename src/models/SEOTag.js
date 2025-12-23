const { Schema, model } = require("mongoose");

const schema = new Schema({
    page_name: {
        type: String,
        required: true,
        index: true
    },
    col_head: {
        type: String,
        required: true
    },
    col_value: {
        type: String,
        required: true
    },
    col_type: String
}, { timestamps: true });

schema.index({ page_name: 1, col_head: 1 }, { unique: true });

module.exports = model("SEOTag", schema);
