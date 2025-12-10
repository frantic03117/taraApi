const { Types } = require("mongoose");
const Offer = require("../models/Offer");

const isValidId = (id) => Types.ObjectId.isValid(id);
exports.createOffer = async (req, res) => {
    try {
        const {
            offer_type,
            category,
            sub_category,
            product,
            variant,
            user,
            discount,
            max_discount,
            max_use,
            start_date,
            end_date
        } = req.body;

        // Validate banner
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Banner image is required" });
        }

        // Validate offer_type
        const validTypes = ["category", "Sub Category", "Product", "Variant"];
        if (!validTypes.includes(offer_type)) {
            return res.status(400).json({ success: false, message: "Invalid offer type" });
        }

        // ------------------------------
        // 🔍 Dynamic Validation Based on Type
        // ------------------------------

        if (offer_type === "category") {
            if (!category || !isValidId(category))
                return res.status(400).json({ success: false, message: "Category is required" });
        }

        if (offer_type === "Sub Category") {
            if (!category || !isValidId(category))
                return res.status(400).json({ success: false, message: "Category is required" });

            if (!sub_category || !isValidId(sub_category))
                return res.status(400).json({ success: false, message: "Sub Category is required" });
        }

        if (offer_type === "Product") {
            if (!category || !isValidId(category))
                return res.status(400).json({ success: false, message: "Category is required" });

            if (!sub_category || !isValidId(sub_category))
                return res.status(400).json({ success: false, message: "Sub Category is required" });

            if (!product || !isValidId(product))
                return res.status(400).json({ success: false, message: "Product is required" });
        }

        if (offer_type === "Variant") {
            if (!category || !isValidId(category))
                return res.status(400).json({ success: false, message: "Category is required" });

            if (!sub_category || !isValidId(sub_category))
                return res.status(400).json({ success: false, message: "Sub Category is required" });

            if (!product || !isValidId(product))
                return res.status(400).json({ success: false, message: "Product is required" });

            if (!variant || !isValidId(variant))
                return res.status(400).json({ success: false, message: "Variant is required" });
        }
        // if (offer_type === "User") {
        //     if (!user || !isValidId(user))
        //         return res.status(400).json({ success: false, message: "User is required" });
        // }

        // ------------------------------
        // Save Offer
        // ------------------------------

        const newOffer = await Offer.create({
            ...req.body,
            offer_banner: req.file.path,
            offer_type,
            category: category || null,
            sub_category: sub_category || null,
            product: product || null,
            variant: variant || null,
            user: user || null,
            discount,
            max_discount,
            max_use: max_use || 100000000,
            start_date,
            end_date,
        });

        return res.json({ success: true, data: newOffer });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.listOffers = async (req, res) => {
    try {
        const {
            id,
            search = "",
            offer_type,
            page = 1,
            limit = 20
        } = req.query;

        const filter = {};

        if (search) {
            filter.offer_id = { $regex: search, $options: "i" };
        }
        if (id) filter._id = id;

        if (offer_type) filter.offer_type = offer_type;

        const skip = (page - 1) * limit;

        const [offers, total] = await Promise.all([
            Offer.find(filter).skip(skip).populate([
                {
                    path: "user"
                },
                {
                    path: "category"
                },
                {
                    path: "sub_category"
                },
                {
                    path: "product"
                },
                {
                    path: "variant"
                },
            ]).limit(parseInt(limit)).sort("-createdAt"),
            Offer.countDocuments(filter)
        ]);

        return res.json({
            success: true,
            data: offers,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.updateOffer = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id))
            return res.status(400).json({ success: false, message: "Invalid offer id" });

        const updateData = { ...req.body };

        if (req.file) {
            updateData.offer_banner = req.file.path;
        }

        // VALIDATION like create (optional — can reuse same function)
        // Add your validation logic here if required

        const updated = await Offer.findByIdAndUpdate(id, updateData, { new: true });

        if (!updated) return res.status(404).json({ success: false, message: "Offer not found" });

        return res.json({ success: true, data: updated });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id))
            return res.status(400).json({ success: false, message: "Invalid offer id" });

        const deleted = await Offer.findByIdAndDelete(id);

        if (!deleted)
            return res.status(404).json({ success: false, message: "Offer not found" });

        return res.json({ success: true, message: "Offer deleted successfully" });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: error.message });
    }
};