const Section = require("../models/Section");

const makeSlug = (title) => {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// Create a new section
exports.create_section = async (req, res) => {
    try {
        const fields = ['title', 'description', 'heading'];
        const emptyFields = fields.filter(field => !req.body[field]);
        
        if (emptyFields.length > 0) {
            return res.json({ 
                success: 0, 
                message: 'The following fields are required:', 
                fields: emptyFields 
            });
        }

        const slug = makeSlug(req.body.title);
        
        // Check if section already exists
        const existingSection = await Section.findOne({ slug });
        if (existingSection) {
            return res.json({ 
                success: 0, 
                message: 'A section with this title already exists' 
            });
        }

        const section = await Section.create({
            title: req.body.title,
            slug: slug,
            description: req.body.description,
            heading: req.body.heading,
            isActive: req.body.isActive !== undefined ? req.body.isActive : true
        });

        return res.json({ 
            success: 1, 
            message: "Section created successfully", 
            data: section 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message, 
            data: req.body 
        });
    }
}

// Get all sections
exports.get_sections = async (req, res) => {
    try {
        const sections = await Section.find({});
        return res.json({ 
            success: 1, 
            message: "Sections fetched successfully",
            data: sections 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Get active sections only
exports.get_active_sections = async (req, res) => {
    try {
        const sections = await Section.find({ isActive: true });
        return res.json({ 
            success: 1, 
            message: "Active sections fetched successfully",
            data: sections 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Get section by ID
exports.get_section = async (req, res) => {
    try {
        const section = await Section.findById(req.params.id);
        
        if (!section) {
            return res.json({ 
                success: 0, 
                message: 'Section not found' 
            });
        }

        return res.json({ 
            success: 1, 
            message: "Section fetched successfully",
            data: section 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Get section by slug
exports.get_section_by_slug = async (req, res) => {
    try {
        const section = await Section.findOne({ slug: req.params.slug });
        
        if (!section) {
            return res.json({ 
                success: 0, 
                message: 'Section not found' 
            });
        }

        return res.json({ 
            success: 1, 
            message: "Section fetched successfully",
            data: section 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Update section
exports.update_section = async (req, res) => {
    try {
        const { id } = req.params;
        const section = await Section.findById(id);

        if (!section) {
            return res.json({ 
                success: 0, 
                message: 'Section not found' 
            });
        }

        const updatedData = { ...req.body };
        
        // If title is being updated, update slug as well
        if (req.body.title && req.body.title !== section.title) {
            const newSlug = makeSlug(req.body.title);
            
            // Check if new slug already exists in another section
            const existingSection = await Section.findOne({ 
                slug: newSlug,
                _id: { $ne: id }
            });
            
            if (existingSection) {
                return res.json({ 
                    success: 0, 
                    message: 'A section with this title already exists' 
                });
            }
            
            updatedData.slug = newSlug;
        }

        const updatedSection = await Section.findByIdAndUpdate(
            id,
            { $set: updatedData },
            { new: true, runValidators: true }
        );

        return res.json({ 
            success: 1, 
            message: "Section updated successfully",
            data: updatedSection 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Delete section
exports.delete_section = async (req, res) => {
    try {
        const { id } = req.params;
        const section = await Section.findByIdAndDelete(id);

        if (!section) {
            return res.json({ 
                success: 0, 
                message: 'Section not found' 
            });
        }

        return res.json({ 
            success: 1, 
            message: "Section deleted successfully",
            data: section 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Toggle section active status
exports.toggle_section_status = async (req, res) => {
    try {
        const { id } = req.params;
        const section = await Section.findById(id);

        if (!section) {
            return res.json({ 
                success: 0, 
                message: 'Section not found' 
            });
        }

        const updatedSection = await Section.findByIdAndUpdate(
            id,
            { $set: { isActive: !section.isActive } },
            { new: true }
        );

        return res.json({ 
            success: 1, 
            message: `Section ${updatedSection.isActive ? 'activated' : 'deactivated'} successfully`,
            data: updatedSection 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}
