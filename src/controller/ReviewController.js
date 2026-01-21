const mongoose = require("mongoose");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Variant = require("../models/Variant");

/**
 * ✅ ADD REVIEW
 * POST /review
 */
exports.addReview = async (req, res) => {
    try {
        const body = req.body;

        // basic validation
        if (!body.product) {
            return res.json({ success: 0, message: "Product is required" });
        }
        if (!body.rating || body.rating < 1 || body.rating > 5) {
            return res.json({ success: 0, message: "Rating must be between 1 and 5" });
        }
        if (!body.review) {
            return res.json({ success: 0, message: "Review is required" });
        }

        // product check
        const productExists = await Product.findById(body.product).select("_id");
        if (!productExists) {
            return res.json({ success: 0, message: "Invalid product" });
        }

        // variant check (optional)
        if (body.variant) {
            const variantExists = await Variant.findOne({
                _id: body.variant,
                product: body.product,
            }).select("_id");

            if (!variantExists) {
                return res.json({ success: 0, message: "Invalid variant" });
            }
        }

        // guest review validation
        if (!body.user && (!body.name || !body.email)) {
            return res.json({
                success: 0,
                message: "Name and email required for guest review",
            });
        }

        // prevent duplicate review (user → product + variant)
        if (body.user) {
            const exists = await Review.findOne({
                product: body.product,
                variant: body.variant || null,
                user: body.user,
                is_deleted: false,
            }).select("_id");

            if (exists) {
                return res.json({
                    success: 0,
                    message: "You already reviewed this product",
                });
            }
        }

        // image (single)
        if (req.file) {
            body.images = ["uploads/" + req.file.filename];
        } else {
            body.images = [];
        }

        body.isAnonymous = Boolean(body.isAnonymous);

        const review = await Review.create(body);

        return res.json({
            success: 1,
            message: "Review added successfully",
            data: review,
        });
    } catch (error) {
        console.error("addReview:", error);
        return res.status(500).json({
            success: 0,
            message: error.message,
        });
    }
};


exports.getReviewsByProduct = async (req, res) => {
    try {
        const { product, variant } = req.query;

        if (!product) {
            return res.json({ success: 0, message: "Product is required" });
        }

        const filter = {
            product,
            is_deleted: false,
            is_active: true,
        };

        if (variant) filter.variant = variant;

        const reviews = await Review.find(filter)
            .populate("user", "first_name last_name profile_image")
            .populate("variant", "variant_name color size")
            .sort({ createdAt: -1 });

        return res.json({
            success: 1,
            message: "Reviews fetched",
            data: reviews,
        });
    } catch (error) {
        console.error("getReviews:", error);
        return res.status(500).json({ success: 0, message: error.message });
    }
};



/**
 * ✅ ADMIN REVIEW LIST
 * GET /review/admin
 * query: page, limit, search, rating, is_active
 */
exports.adminReviewList = async (req, res) => {
    try {
        let {
            page = 1,
            limit = 20,
            search = "",
            rating,
            is_active,
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const filter = {
            is_deleted: false,
        };

        // filter rating
        if (rating) filter.rating = Number(rating);

        // filter active/inactive
        if (is_active !== undefined) {
            if (is_active === "true") filter.is_active = true;
            if (is_active === "false") filter.is_active = false;
        }

        // ✅ Search support: name/email/review
        if (search && search.trim() !== "") {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { name: regex },
                { email: regex },
                { review: regex },
                { title: regex },
            ];
        }

        const total = await Review.countDocuments(filter);

        const reviews = await Review.find(filter)
            .populate("product", "title thumbnail slug")
            .populate("variant", "variant_name color size sku slug")
            .populate("user", "first_name last_name email profile_image")
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

        return res.json({
            success: 1,
            message: "Admin review list fetched",
            data: reviews,
            meta: {
                total,
                page,
                limit,
            },
        });
    } catch (error) {
        console.error("adminReviewList:", error);
        return res.status(500).json({
            success: 0,
            message: error.message,
        });
    }
};




exports.updateReview = async (req, res) => {
    try {
        const body = req.body;

        if (!body._id) {
            return res.json({ success: 0, message: "Review id required" });
        }

        if (req.file) {
            body.images = ["uploads/" + req.file.filename];
        }

        const updated = await Review.findOneAndUpdate(
            { _id: body._id, is_deleted: false },
            { $set: body },
            { new: true }
        );

        if (!updated) {
            return res.json({ success: 0, message: "Review not found" });
        }

        return res.json({
            success: 1,
            message: "Review updated successfully",
            data: updated,
        });
    } catch (error) {
        console.error("updateReview:", error);
        return res.status(500).json({ success: 0, message: error.message });
    }
};


exports.deleteReview = async (req, res) => {
    try {
        const { _id } = req.body;

        if (!_id) {
            return res.json({ success: 0, message: "Review id required" });
        }

        const deleted = await Review.findOneAndUpdate(
            { _id },
            { $set: { is_deleted: true } },
            { new: true }
        );

        if (!deleted) {
            return res.json({ success: 0, message: "Review not found" });
        }

        return res.json({
            success: 1,
            message: "Review deleted successfully",
            data: deleted,
        });
    } catch (error) {
        console.error("deleteReview:", error);
        return res.status(500).json({ success: 0, message: error.message });
    }
};
