const PageContent = require("../models/PageContent");

const makeSlug = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

// Create page content section
exports.create_page_content = async (req, res) => {
    try {
        const fields = ['pageName', 'sectionName', 'sectionTitle'];
        const emptyFields = fields.filter(field => !req.body[field]);
        
        if (emptyFields.length > 0) {
            return res.json({ 
                success: 0, 
                message: 'Required fields: pageName, sectionName, sectionTitle', 
                fields: emptyFields 
            });
        }

        const sectionSlug = makeSlug(req.body.sectionName);
        
        const data = {
            ...req.body,
            sectionSlug: sectionSlug,
            contentBlocks: req.body.contentBlocks || [],
            isActive: req.body.isActive !== undefined ? req.body.isActive : true
        };

        const pageContent = await PageContent.create(data);

        return res.json({ 
            success: 1, 
            message: "Page content created successfully", 
            data: pageContent 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Get all page content
exports.get_all_page_content = async (req, res) => {
    try {
        const content = await PageContent.find({}).sort({ pageName: 1, order: 1 });
        return res.json({ 
            success: 1, 
            message: "Page content fetched successfully",
            data: content 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Get page content by page name
exports.get_page_content = async (req, res) => {
    try {
        const { pageName } = req.params;
        const content = await PageContent.find({ pageName, isActive: true }).sort({ order: 1 });
        
        if (!content || content.length === 0) {
            return res.json({ 
                success: 0, 
                message: 'No content found for this page' 
            });
        }

        return res.json({ 
            success: 1, 
            message: "Page content fetched successfully",
            data: content 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Get page section by ID
exports.get_page_section = async (req, res) => {
    try {
        const { id } = req.params;
        const content = await PageContent.findById(id);
        
        if (!content) {
            return res.json({ 
                success: 0, 
                message: 'Section not found' 
            });
        }

        return res.json({ 
            success: 1, 
            message: "Section fetched successfully",
            data: content 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Update page section
exports.update_page_section = async (req, res) => {
    try {
        const { id } = req.params;
        const section = await PageContent.findById(id);

        if (!section) {
            return res.json({ 
                success: 0, 
                message: 'Section not found' 
            });
        }

        const updatedData = { ...req.body };
        
        // Update slug if sectionName changes
        if (req.body.sectionName && req.body.sectionName !== section.sectionName) {
            updatedData.sectionSlug = makeSlug(req.body.sectionName);
        }

        const updatedSection = await PageContent.findByIdAndUpdate(
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

// Add content block to section
exports.add_content_block = async (req, res) => {
    try {
        const { id } = req.params;
        const section = await PageContent.findById(id);

        if (!section) {
            return res.json({ 
                success: 0, 
                message: 'Section not found' 
            });
        }

        const newBlock = {
            title: req.body.title || "",
            subtitle: req.body.subtitle || "",
            description: req.body.description || "",
            image: req.body.image || "",
            imageAlt: req.body.imageAlt || "",
            order: req.body.order !== undefined ? req.body.order : section.contentBlocks.length,
            isActive: req.body.isActive !== undefined ? req.body.isActive : true
        };

        section.contentBlocks.push(newBlock);
        const updated = await section.save();

        return res.json({ 
            success: 1, 
            message: "Content block added successfully",
            data: updated 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Update content block
exports.update_content_block = async (req, res) => {
    try {
        const { id, blockId } = req.params;
        const section = await PageContent.findById(id);

        if (!section) {
            return res.json({ 
                success: 0, 
                message: 'Section not found' 
            });
        }

        const block = section.contentBlocks.id(blockId);
        if (!block) {
            return res.json({ 
                success: 0, 
                message: 'Content block not found' 
            });
        }

        // Update block fields
        if (req.body.title !== undefined) block.title = req.body.title;
        if (req.body.subtitle !== undefined) block.subtitle = req.body.subtitle;
        if (req.body.description !== undefined) block.description = req.body.description;
        if (req.body.image !== undefined) block.image = req.body.image;
        if (req.body.imageAlt !== undefined) block.imageAlt = req.body.imageAlt;
        if (req.body.order !== undefined) block.order = req.body.order;
        if (req.body.isActive !== undefined) block.isActive = req.body.isActive;

        const updated = await section.save();

        return res.json({ 
            success: 1, 
            message: "Content block updated successfully",
            data: updated 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Delete content block
exports.delete_content_block = async (req, res) => {
    try {
        const { id, blockId } = req.params;
        const section = await PageContent.findById(id);

        if (!section) {
            return res.json({ 
                success: 0, 
                message: 'Section not found' 
            });
        }

        section.contentBlocks.id(blockId).deleteOne();
        const updated = await section.save();

        return res.json({ 
            success: 1, 
            message: "Content block deleted successfully",
            data: updated 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Delete entire page section
exports.delete_page_section = async (req, res) => {
    try {
        const { id } = req.params;
        const section = await PageContent.findByIdAndDelete(id);

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
        const section = await PageContent.findById(id);

        if (!section) {
            return res.json({ 
                success: 0, 
                message: 'Section not found' 
            });
        }

        const updated = await PageContent.findByIdAndUpdate(
            id,
            { $set: { isActive: !section.isActive } },
            { new: true }
        );

        return res.json({ 
            success: 1, 
            message: `Section ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
            data: updated 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}

// Reorder page content sections
exports.reorder_sections = async (req, res) => {
    try {
        const { pageName } = req.params;
        const { sections } = req.body;

        if (!Array.isArray(sections)) {
            return res.json({ 
                success: 0, 
                message: 'Sections must be an array' 
            });
        }

        const updated = [];
        for (const section of sections) {
            const updatedSection = await PageContent.findByIdAndUpdate(
                section.id,
                { $set: { order: section.order } },
                { new: true }
            );
            updated.push(updatedSection);
        }

        return res.json({ 
            success: 1, 
            message: "Sections reordered successfully",
            data: updated 
        });
    } catch (err) {
        return res.json({ 
            success: 0, 
            message: err.message 
        });
    }
}
