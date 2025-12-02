const mongoose = require("mongoose");

const { Schema } = mongoose;

const CountrySchema = new Schema({
    name: {
        type: String
    },
    dial_code: {
        type: String,
    },
    code: {
        type: String,
    },
    flag: String,
    flag_image: String,
    currency: String,
    continent: String,
}, { timestamps: true });
const Country = mongoose.model("Country", CountrySchema);

module.exports = Country;
