const { Schema, model } = require("mongoose");

const counterSchema = new Schema({
    key: { type: String, unique: true },
    seq: { type: Number, default: 0 }
});

module.exports = model("Counter", counterSchema);
