const Setting = require("../models/Setting")
const makeSlug = (title) => {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}
exports.create_setting = async (req, res) => {
    try {
        const fields = ['title', 'type'];
        const emptyFields = fields.filter(field => !req.body[field]);
        if (emptyFields.length > 0) {
            return res.json({ success: 0, errors: 'The following fields are required:', fields: emptyFields });
        }
        const data = { ...req.body };
        // const media_value = req.body.media_value;
        const url = makeSlug(req.body.title + "-" + req.body.media_value);
        if (req.file) {
            data['file'] = req.file.path
        }
        data['slug'] = url;
        const resp = await Setting.create(data);
        return res.json({ success: 1, message: "Created successfully", data: resp })
    } catch (err) {
        return res.json({ success: 0, message: err.message, data: req.body })
    }
}
exports.create_or_update_settings = async (req, res) => {
    try {
        const settings = [];

        for (const key in req.body) {
            settings.push({
                title: key.replace(/_/g, ' '),
                type: key,
                media_value: req.body[key]
            });
        }

        // Handle files
        if (req.files?.logo) {
            settings.push({
                title: 'logo',
                type: 'logo',
                media_value: req.files.logo[0].path
            });
        }

        if (req.files?.favicon) {
            settings.push({
                title: 'favicon',
                type: 'favicon',
                media_value: req.files.favicon[0].path
            });
        }

        const results = [];

        for (const item of settings) {
            const slug = makeSlug(item.title);

            const existing = await Setting.findOne({ slug });

            let saved;
            if (existing) {
                saved = await Setting.findOneAndUpdate(
                    { slug },
                    { $set: { ...item, slug } },
                    { new: true }
                );
            } else {
                saved = await Setting.create({ ...item, slug });
            }

            results.push(saved);
        }

        return res.json({
            success: 1,
            message: "Website settings saved successfully",
            data: results
        });

    } catch (err) {
        return res.json({ success: 0, message: err.message });
    }
};



exports.get_setting = async (req, res) => {
    try {

        const { id, keyword, type, title, media_value, parent, page = 1, perPage = 10, type_not } = req.query;
        const fdata = {};

        if (type) {
            fdata['type'] = { $in: type.split(',') };
        }
        if (id) {
            fdata['_id'] = id;
        }
        if (title) {
            fdata['title'] = { $regex: title, $options: "i" };
        }
        if (parent) {
            fdata['parent'] = parent;
        }
        if (media_value) {
            fdata['media_value'] = media_value;
        }
        if (type_not) {
            fdata['type'] = { $nin: type_not.split(',') };
        }
        const resp = await Setting.find(fdata).populate('parent')
        return res.json({ success: 1, message: "Fetched successfully", data: resp })
    } catch (err) {
        return res.json({ success: 0, message: err.message })
    }
}
exports.delete_setting = async (req, res) => {
    try {
        const resp = await Setting.deleteOne({ _id: req.params.id });
        return res.json({ success: 1, message: "deleted successfully", data: resp })
    } catch (err) {
        return res.json({ success: 0, message: err.message })
    }
}
exports.update_setting = async (req, res) => {
    try {
        const data = { ...req.body };
        const media_value = req.body.media_value;
        if (req.file) {
            data['file'] = req.file.path
        }
        if (media_value) {
            const url = makeSlug(media_value);
            data['slug'] = url;
        }
        const resp = await Setting.findOneAndUpdate({ _id: req.params.id }, { $set: { ...data } }, { new: true });
        return res.json({ success: 1, message: "updated successfully", data: resp })
    } catch (err) {
        return res.json({ success: 0, message: err.message })
    }
}
exports.update_activation = async (req, res) => {
    try {
        const { id } = req.params;
        const findSetting = await Setting.findById(id);

        if (!findSetting) {
            return res.status(404).json({ success: 0, message: "Not found" });
        }

        findSetting.isActive = !findSetting.isActive;
        await findSetting.save();

        return res.json({
            success: 1,
            message: "Updated successfully",
            data: { id: findSetting._id, isActive: findSetting.isActive },
        });
    } catch (err) {
        return res.status(500).json({ success: 0, message: err.message });
    }
};
exports.getTypes = async (req, res) => {
    const resp = await Setting.distinct("type");
    return res.json({ success: 1, message: "Setting", data: resp });
}
exports.menubar_web = async (req, res) => {
    try {
        // 1️⃣ Get all top-level menu items
        const tabs = await Setting.find({
            type: "nav_menu",
            parent: null,
            isActive: true
        }, { title: 1, slug: 1 }).sort({ order: 1 });

        // 2️⃣ Fetch categories + subcategories for each tab
        const menu = await Promise.all(
            tabs.map(async (tab) => {
                // Get categories under this menu tab
                const categories = await Setting.find({
                    parent: tab._id,
                    type: "category",
                    isActive: true
                }, { title: 1, slug: 1, file: 1 }).sort({ order: 1 });

                // Add subcategories for each category
                const categoriesWithChildren = await Promise.all(
                    categories.map(async (cat) => {
                        const subcategories = await Setting.find({
                            parent: cat._id,
                            type: "sub-category",
                            isActive: true
                        }, { title: 1, slug: 1 }).sort({ order: 1 }).lean()

                        return {
                            ...cat.toObject(),
                            children: subcategories,
                        };
                    })
                );

                return {
                    ...tab.toObject(),
                    children: categoriesWithChildren
                };
            })
        );

        return res.json({
            success: 1,
            message: "Navbar Menu",
            data: menu
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: 0, message: "Server error" });
    }
};
