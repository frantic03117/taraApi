const SEOTag = require("../models/SEOTag");

exports.upsertSEO = async (req, res) => {
    try {
        const seoData = req.body;

        if (!Array.isArray(seoData)) {
            return res.status(400).json({ message: "Invalid payload format" });
        }

        const bulkOps = seoData.map(item => ({
            updateOne: {
                filter: {
                    page_name: item.page_name,
                    col_head: item.col_head
                },
                update: {
                    $set: {
                        col_value: item.col_value,
                        col_type: item.col_head.includes('image') ? 'image' : 'text'
                    }
                },
                upsert: true
            }
        }));

        await SEOTag.bulkWrite(bulkOps);

        res.status(200).json({
            success: true,
            message: "SEO data saved successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Failed to save SEO data"
        });
    }
};
exports.getSEOByPage = async (req, res) => {
    try {
        const { page_name } = req.params;

        const seo = await SEOTag.find({ page_name }).select("-__v");

        res.status(200).json({
            success: true,
            data: seo
        });
    } catch (error) {
        console.log(error)
        res.status(500).json({
            success: false,
            message: "Failed to fetch SEO data"
        });
    }
};
exports.deleteSEOField = async (req, res) => {
    try {
        const { page_name, col_head } = req.body;

        await SEOTag.findOneAndDelete({ page_name, col_head });

        res.status(200).json({
            success: true,
            message: "SEO field deleted"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Delete failed"
        });
    }
};
exports.deleteSEOPage = async (req, res) => {
    try {
        await SEOTag.deleteMany({ page_name: req.params.page_name });

        res.status(200).json({
            success: true,
            message: "SEO page deleted"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to delete SEO page"
        });
    }
};

