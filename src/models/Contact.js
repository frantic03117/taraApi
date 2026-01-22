// Import dependencies
const mongoose = require("mongoose");

// Contact Schema with SEO Fields
const contactSchema = new mongoose.Schema({


    name: { type: String },
    email: { type: String },
    message: { type: String },


    createdAt: { type: Date, default: Date.now },
});


const Contact = mongoose.model("Contact", contactSchema);



module.exports = Contact;