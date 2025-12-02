const { Schema } = require("mongoose");

const schema = new Schema({
    parent: {
        type: Schema.Types.ObjectId,
        ref: "Category",
        default: null
    },
    slug: {
        type: String
    },
    title: {
        type: String
    },
    file: {
        type: String
    },
    short_description: String,
    description: String,
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });


module.exports = new model('Category', schema);