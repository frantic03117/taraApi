const { Schema, model } = require("mongoose");

const schema = new Schema({
    type: {
        type: String
    },
    url: String,
    order: {
        type: Number
    },
    file: {
        type: String
    },
    file_type: String,
    heading: {
        type: String
    },
    short_description: {
        type: String
    },
    buttons: [
        {
            btn_label: String,
            btn_classes: String
        }
    ],
    paragraph: String

}, { timestamps: true });

module.exports = new model('Banner', schema);