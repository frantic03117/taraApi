const { Types } = require("mongoose");
const Testimonial = require("../models/Testimonial");
const isValidObjectId = (id) => Types.ObjectId.isValid(id);
exports.createTestimonial = async (req, res) => {
    try {
        const { user, name, sub_label, sub_title, description, type = "testimonial" } = req.body;

        // Validation
        if (!name) return res.status(400).json({ success: 0, message: "Name is required" });
        if (!description) return res.status(400).json({ success: 0, message: "Description is required" });

        // Validate user (if provided)
        if (user && !isValidObjectId(user)) {
            return res.status(400).json({ success: 0, message: "Invalid user ID" });
        }

        // File validation
        if (!req.file) {
            return res.status(400).json({ success: 0, message: "Please upload an image or video" });
        }

        const file = req.file.path;
        const file_type = req.file.mimetype;

        const newData = await Testimonial.create({
            user: user || null,
            name,
            sub_label,
            sub_title,
            description,
            file,
            file_type,
            type
        });

        return res.json({ success: 1, message: "Created successfully", data: newData });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: 0, message: error.message });
    }
};
exports.getTestimonials = async (req, res) => {
    try {
        // await Testimonial.updateMany({}, { type: "testimonial" })
        const { id, type } = req.query;
        const fdata = {};
        if (id) fdata['_id'] = id;
        if (type) {
            fdata.type = type;  // filter by the provided type
        } else {
            fdata.type = "testimonial"
        }
        const data = await Testimonial.find(fdata).sort({ createdAt: -1 });

        return res.json({ success: 1, data, fdata });
    } catch (error) {
        return res.status(500).json({ success: 0, message: error.message });
    }
};
exports.updateTestimonial = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id))
            return res.status(400).json({ success: 0, message: "Invalid ID" });

        const updateData = { ...req.body };

        // If new file uploaded
        if (req.file) {
            updateData.file = req.file.path;
            updateData.file_type = req.file.mimetype;
        }

        const updated = await Testimonial.findByIdAndUpdate(id, updateData, { new: true });

        if (!updated)
            return res.status(404).json({ success: 0, message: "Not found" });

        return res.json({ success: 1, message: "Updated successfully", data: updated });

    } catch (error) {
        return res.status(500).json({ success: 0, message: error.message });
    }
};
exports.deleteTestimonial = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id))
            return res.status(400).json({ success: 0, message: "Invalid ID" });

        const deleted = await Testimonial.findByIdAndDelete(id);

        if (!deleted)
            return res.status(404).json({ success: 0, message: "Not found" });

        return res.json({ success: 1, message: "Deleted successfully" });

    } catch (error) {
        return res.status(500).json({ success: 0, message: error.message });
    }
};
