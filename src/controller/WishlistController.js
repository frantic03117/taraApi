const mongoose = require("mongoose");
const Wishlist = require("../models/Wishlist");
const Variant = require("../models/Variant");
const Review = require("../models/Review");


/**
 * ✅ ADD TO WISHLIST
 * POST /wishlist
 * body: { variantId }
 */
exports.addToWishlist = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { variantId } = req.body;

        if (!userId) {
            return res.status(401).json({ success: 0, message: "Unauthorized" });
        }

        if (!variantId || !mongoose.Types.ObjectId.isValid(variantId)) {
            return res.status(400).json({ success: 0, message: "Invalid variantId" });
        }

        // ✅ check variant exist
        const variant = await Variant.findOne({ _id: variantId, is_deleted: false }).select("product");
        if (!variant) {
            return res.status(404).json({ success: 0, message: "Variant not found" });
        }

        const doc = await Wishlist.findOneAndUpdate(
            { user: userId, variant: variantId },
            {
                $setOnInsert: {
                    user: userId,
                    variant: variantId,
                    product: variant.product || null,
                },
            },
            { new: true, upsert: true }
        );

        return res.json({
            success: 1,
            message: "Added to wishlist",
            data: doc,
        });
    } catch (error) {
        console.log(error);

        // unique index duplicate
        if (error?.code === 11000) {
            return res.json({ success: 1, message: "Already in wishlist" });
        }

        return res.status(500).json({ success: 0, message: error.message });
    }
};

/**
 * ✅ REMOVE FROM WISHLIST
 * DELETE /wishlist/:variantId
 */
exports.removeFromWishlist = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { variantId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: 0, message: "Unauthorized" });
        }

        if (!variantId || !mongoose.Types.ObjectId.isValid(variantId)) {
            return res.status(400).json({ success: 0, message: "Invalid variantId" });
        }

        await Wishlist.deleteOne({ user: userId, variant: variantId });

        return res.json({ success: 1, message: "Removed from wishlist" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: 0, message: error.message });
    }
};

/**
 * ✅ GET USER WISHLIST
 * GET /wishlist
 */
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: 0, message: "Unauthorized" });
        }

        let list = await Wishlist.find({ user: userId })
            .sort({ createdAt: -1 })
            .populate([
                {
                    path: "variant",
                    match: { is_deleted: false },
                    select: "sku variant_name slug sale_price mrp stock color size images product",
                    populate: {
                        path: "product",
                        select: "name images category title slug description size_chart color_pattern",
                        populate: {
                            path: "category",
                            select: "parent title slug file",
                            populate: {
                                path: "parent",
                                select: "title slug file",
                            },
                        },
                    },
                },
            ])
            .lean();

        // ✅ remove null variants (deleted variants)
        list = list.filter((x) => x.variant);

        // ✅ collect variantIds
        const variantIds = list.map((x) => x.variant?._id).filter(Boolean);

        // ✅ reviews aggregation
        const reviewStats = await Review.aggregate([
            { $match: { variant: { $in: variantIds } } },
            {
                $group: {
                    _id: "$variant",
                    count: { $sum: 1 },
                    avg_stars: { $avg: "$rating" }, // ⭐ your review field
                },
            },
        ]);

        const reviewMap = {};
        reviewStats.forEach((r) => {
            reviewMap[r._id.toString()] = {
                review_count: r.count,
                avg_stars: r.avg_stars || 0,
            };
        });

        // ✅ attach review_count + avg_stars inside variant
        const data = list.map((item) => {
            const vid = item.variant?._id?.toString();

            return {
                ...item,
                variant: {
                    ...item.variant,
                    review_count: reviewMap[vid]?.review_count || 0,
                    avg_stars: Number((reviewMap[vid]?.avg_stars || 0).toFixed(1)),
                },
            };
        });

        return res.json({ success: 1, data });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: 0, message: error.message });
    }
};


/**
 * ✅ CHECK ITEM EXISTS IN WISHLIST
 * GET /wishlist/check/:variantId
 */
exports.checkWishlist = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { variantId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: 0, message: "Unauthorized" });
        }

        if (!variantId || !mongoose.Types.ObjectId.isValid(variantId)) {
            return res.status(400).json({ success: 0, message: "Invalid variantId" });
        }

        const exists = await Wishlist.exists({ user: userId, variant: variantId });

        return res.json({
            success: 1,
            inWishlist: !!exists,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: 0, message: error.message });
    }
};
