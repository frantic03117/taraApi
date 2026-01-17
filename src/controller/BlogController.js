const Blog = require("../models/Blogs");



const makeSlug = (title = "") => {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
};

// ✅ helper: parse keywords (FormData sends string)
const parseKeywords = (keywords) => {
    if (!keywords) return [];

    // if already array
    if (Array.isArray(keywords)) return keywords;

    // if string => JSON array or comma string
    if (typeof keywords === "string") {
        try {
            const parsed = JSON.parse(keywords);
            if (Array.isArray(parsed)) return parsed;
        } catch (err) {
            // fallback: comma separated
            return keywords
                .split(",")
                .map((k) => k.trim())
                .filter(Boolean);
        }
    }

    return [];
};

exports.create_blog = async (req, res) => {
    try {
        const data = { ...req.body };

        console.log("Res", data)

        // ✅ SEO keywords parse
        data.keywords = parseKeywords(req.body.keywords);

        // ✅ slug auto generate
        const title = req.body.title || "";
        data.slug = makeSlug(title);

        // ✅ Files (safe check)
        if (req.files?.banner?.length) {
            data.banner = req.files.banner[0].path;
        }
        if (req.files?.thumbnail?.length) {
            data.thumbnail = req.files.thumbnail[0].path;
        }

        // Create the blog
        const resp = await Blog.create(data);





        return res.json({
            success: 1,
            message: "Blog created successfully",
            data: resp,
        });
    } catch (err) {
        return res.json({ success: 0, message: err.message });
    }
};

exports.get_blog = async (req, res) => {
    try {
        const { id, url, keyword } = req.query;

        const perPage = Number(req.query.perPage || 10);
        const page = Number(req.query.page || 1);

        const fdata = {};

        if (id) fdata._id = id;
        if (url) fdata.slug = url;

        if (keyword) {
            fdata.$or = [
                { title: { $regex: keyword, $options: "i" } },
                { metaDescription: { $regex: keyword, $options: "i" } },
            ];
        }

        const totalDocs = await Blog.countDocuments(fdata);
        const totalPages = Math.ceil(totalDocs / perPage);
        const skip = (page - 1) * perPage;

        const resp = await Blog.find(fdata)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage);

        return res.json({
            success: 1,
            message: "Blog fetched successfully",
            data: resp,
            pagination: {
                totalPages,
                perPage,
                page,
                totalDocs,
            },
        });
    } catch (err) {
        return res.json({ success: 0, message: err.message });
    }
};

exports.latest_blog = async (req, res) => {
    try {
        const { id, url } = req.query;
        const fdata = {};

        if (id) fdata._id = { $ne: id };
        if (url) fdata.slug = { $ne: url };

        const resp = await Blog.find(fdata)
            .sort({ createdAt: -1 })
            .limit(6);

        return res.json({
            success: 1,
            message: "Latest blogs fetched successfully",
            data: resp,
        });
    } catch (err) {
        return res.json({ success: 0, message: err.message });
    }
};

exports.update_blog = async (req, res) => {
    try {
        const { id } = req.params;

        const data = { ...req.body };

        // ✅ keywords parse
        data.keywords = parseKeywords(req.body.keywords);

        // ✅ slug regenerate
        const title = req.body.title || "";
        data.slug = makeSlug(title);

        // ✅ files (safe)
        if (req.files?.banner?.length) {
            data.banner = req.files.banner[0].path;
        }
        if (req.files?.thumbnail?.length) {
            data.thumbnail = req.files.thumbnail[0].path;
        }

        const resp = await Blog.findOneAndUpdate(
            { _id: id },
            { $set: data },
            { new: true }
        );

        return res.json({
            success: 1,
            message: "Blog updated successfully",
            data: resp,
        });
    } catch (err) {
        return res.json({ success: 0, message: err.message });
    }
};

exports.delete_blog = async (req, res) => {
    try {
        const { id } = req.params;

        const resp = await Blog.deleteOne({ _id: id });

        return res.json({
            success: 1,
            message: "Blog deleted successfully",
            data: resp,
        });
    } catch (err) {
        return res.json({ success: 0, message: err.message });
    }
};
