const PageContent = require("../models/PageContent");

const makeSlug = (text) => {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}


exports.create_page_content = async (req, res) => {
    try {
        // ── 1. Required field validation ──────────────────────────────────────
        const requiredFields = ['pageName', 'sectionName', 'sectionTitle'];
        const emptyFields = requiredFields.filter(field => !req.body[field]?.trim());

        if (emptyFields.length > 0) {
            return res.status(400).json({
                success: 0,
                message: "Required fields are missing",
                fields: emptyFields
            });
        }

        // ── 2. pageName enum validation ───────────────────────────────────────
        const allowedPages = ['about', 'home', 'contact', 'policy'];
        if (!allowedPages.includes(req.body.pageName.toLowerCase())) {
            return res.status(400).json({
                success: 0,
                message: `pageName must be one of: ${allowedPages.join(', ')}`
            });
        }

        // ── 3. contentType validation (if provided) ───────────────────────────
        const allowedContentTypes = ['text', 'image', 'text-image', 'carousel', 'gallery', 'team-member'];
        if (req.body.contentType && !allowedContentTypes.includes(req.body.contentType)) {
            return res.status(400).json({
                success: 0,
                message: `contentType must be one of: ${allowedContentTypes.join(', ')}`
            });
        }

        // ── 4. Build slug & check uniqueness ──────────────────────────────────
        const sectionSlug = makeSlug(req.body.sectionName);
        const exists = await PageContent.findOne({
            pageName: req.body.pageName.toLowerCase(),
            sectionSlug
        });

        if (exists) {
            return res.status(409).json({
                success: 0,
                message: `Section "${req.body.sectionName}" already exists on page "${req.body.pageName}"`
            });
        }

        // ── 5. Parse & attach uploaded images to contentBlocks ────────────────
        //    Multer puts files in req.files as an array with fieldname "images"
        //    Frontend should send: images[0], images[1], ... matching block order
        let contentBlocks = [];

        if (req.body.contentBlocks) {
            // contentBlocks arrives as a JSON string when using multipart/form-data
            try {
                contentBlocks = typeof req.body.contentBlocks === 'string'
                    ? JSON.parse(req.body.contentBlocks)
                    : req.body.contentBlocks;
            } catch {
                return res.status(400).json({
                    success: 0,
                    message: "contentBlocks must be a valid JSON array"
                });
            }

            if (!Array.isArray(contentBlocks)) {
                return res.status(400).json({
                    success: 0,
                    message: "contentBlocks must be an array"
                });
            }

            // Map uploaded files to their corresponding blocks by index
            // Expects field names like: blockImage_0, blockImage_1, ...
            const uploadedFiles = req.files || [];
            // return res.status(400).json({ data: uploadedFiles, success: false });
            const fileMap = {};
            uploadedFiles.forEach(file => {
                // fieldname example: "blockImage_0"
                const match = file.fieldname.match(/blockImage_(\d+)/);
                if (match) fileMap[parseInt(match[1])] = file.path;
            });

            contentBlocks = contentBlocks.map((block, index) => ({
                title: block.title || "",
                subtitle: block.subtitle || "",
                description: block.description || "",
                imageAlt: block.imageAlt || "",
                order: block.order ?? index,
                isActive: block.isActive !== undefined ? block.isActive : true,
                // use uploaded file if present, otherwise keep any existing URL
                image: fileMap[index] || block.image || ""
            }));
        }

        // ── 6. Create document ────────────────────────────────────────────────
        const pageContent = await PageContent.create({
            pageName: req.body.pageName.toLowerCase(),
            sectionName: req.body.sectionName.trim(),
            sectionSlug,
            sectionTitle: req.body.sectionTitle.trim(),
            sectionDescription: req.body.sectionDescription || "",
            contentType: req.body.contentType || 'text-image',
            contentBlocks,
            order: req.body.order || 0,
            isActive: req.body.isActive !== undefined ? req.body.isActive : true
        });

        return res.status(201).json({
            success: 1,
            message: "Page content created successfully",
            data: pageContent
        });

    } catch (err) {
        // Handle Mongoose duplicate key error (race condition safety net)
        if (err.code === 11000) {
            return res.status(409).json({
                success: 0,
                message: "A section with this slug already exists on this page"
            });
        }
        return res.status(500).json({
            success: 0,
            message: err.message
        });
    }
};

// Get all page content
exports.get_all_page_content = async (req, res) => {
    try {
        const { pageName } = req.query;
        let fdata = {};
        if (pageName) {
            fdata['pageName'] = pageName;
        }
        const content = await PageContent.find(fdata).sort({ pageName: 1, order: 1 });
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
        if (req.files.length > 0) block.image = req.files[0]?.path;
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

exports.reorderContentBlocks = async (req, res) => {
    try {
        const { sectionId } = req.params;
        const updates = req.body.blocks; // array of {_id, order}

        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid payload format",
            });
        }

        const section = await PageContent.findById(sectionId);

        if (!section) {
            return res.status(404).json({
                success: false,
                message: "Section not found",
            });
        }

        // Create map for quick lookup
        const orderMap = new Map();
        updates.forEach(item => {
            orderMap.set(item._id.toString(), item.order);
        });

        // Update order values
        section.contentBlocks.forEach(block => {
            if (orderMap.has(block._id.toString())) {
                block.order = orderMap.get(block._id.toString());
            }
        });

        // Optional: sort array after updating
        section.contentBlocks.sort((a, b) => a.order - b.order);

        await section.save();

        res.status(200).json({
            success: true,
            message: "Content blocks reordered successfully",
            data: section.contentBlocks,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};


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
