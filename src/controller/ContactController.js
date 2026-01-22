const Contact = require("../models/Contact");

// ✅ Create Contact (POST)
exports.createContact = async (req, res) => {
    try {
        const { name, email, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: "Name, Email and Message are required",
            });
        }

        const contact = await Contact.create({
            name,
            email,
            message,
        });

        return res.status(201).json({
            success: true,
            message: "Contact created successfully",
            data: contact,
        });
    } catch (error) {
        console.error("Create Contact Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// ✅ Get All Contacts (GET)
exports.getContacts = async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            message: "Contacts fetched successfully",
            data: contacts,
        });
    } catch (error) {
        console.error("Get Contacts Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// ✅ Get Single Contact by ID (GET)
exports.getContactById = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findById(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Contact fetched successfully",
            data: contact,
        });
    } catch (error) {
        console.error("Get Contact By ID Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// ✅ Delete Contact (DELETE)
exports.deleteContact = async (req, res) => {
    try {
        const { id } = req.params;

        const contact = await Contact.findByIdAndDelete(id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: "Contact not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Contact deleted successfully",
        });
    } catch (error) {
        console.error("Delete Contact Error:", error);
        return res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};
