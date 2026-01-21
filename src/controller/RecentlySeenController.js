const mongoose = require("mongoose");
const RecentlySeen = require("../models/RecentlySeen");
const Variant = require("../models/Variant");
const Review = require("../models/Review");






exports.saveRecentlySeen = async (req, res) => {
    try {
        const { productId } = req.params;

        const cart_token = req.headers["cart_token"] || req.body.cart_token || null;



        const userId = req.user?._id || null;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: 0, message: "Invalid productId" });
        }

        if (!userId && !cart_token) {
            return res.status(400).json({ success: 0, message: "cart_token or user required" });
        }

        await RecentlySeen.findOneAndUpdate(
            userId
                ? { user: userId, product: productId }
                : { cart_token, product: productId },
            { $set: { seenAt: new Date() } },
            { upsert: true, new: true }
        );

        return res.json({ success: 1, message: "Recently seen saved" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: 0, message: error.message });
    }
};


exports.getRecentlySeen = async (req, res) => {
    try {
        const cart_token = req.headers["cart_token"] || req.query.cart_token || null;
        const userId = req.user?._id || null;

        if (!userId && !cart_token) {
            return res
                .status(400)
                .json({ success: 0, message: "cart_token or user required" });
        }

        // ✅ recently seen list
        const seenList = await RecentlySeen.find(userId ? { user: userId } : { cart_token })
            .sort({ seenAt: -1 })
            .limit(20)
            .select("product");

        let seenVariantIds = seenList.map((x) => x.product);

        let variants = [];

        /* ----------------------------------------------------
           ✅ RULE 2: if no product seen => each category 1
        -----------------------------------------------------*/
        if (seenVariantIds.length === 0) {
            // 1) get one variant per category
            const categoryWiseVariants = await Variant.aggregate([
                { $match: { is_deleted: false } },
                {
                    $lookup: {
                        from: "products",
                        localField: "product",
                        foreignField: "_id",
                        as: "productDoc",
                    },
                },
                { $unwind: "$productDoc" },
                { $match: { "productDoc.is_deleted": false } },

                // group by category, pick first variant
                {
                    $group: {
                        _id: "$productDoc.category",
                        variant: { $first: "$$ROOT" },
                    },
                },

                { $replaceRoot: { newRoot: "$variant" } },
                { $limit: 4 },
            ]);

            const ids = categoryWiseVariants.map((v) => v._id);

            variants = await Variant.find({ _id: { $in: ids } })
                .populate([
                    {
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
                ])
                .lean();

            // ✅ review_count + avg_stars
            const reviewStats = await Review.aggregate([
                { $match: { variant: { $in: ids } } },
                {
                    $group: {
                        _id: "$variant",
                        count: { $sum: 1 },
                        avg_stars: { $avg: "$rating" },
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

            variants = variants.map((v) => ({
                ...v,
                review_count: reviewMap[v._id.toString()]?.review_count || 0,
                avg_stars: Number((reviewMap[v._id.toString()]?.avg_stars || 0).toFixed(1)),
            }));

            return res.json({
                success: 1,
                total: variants.length,
                data: variants,
            });
        }

        /* ----------------------------------------------------
           ✅ IF seen products exist => fetch those variants
        -----------------------------------------------------*/
        variants = await Variant.find({
            _id: { $in: seenVariantIds },
            is_deleted: false,
        })
            .populate([
                {
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
            ])
            .lean();

        // ✅ keep order as recently seen
        const variantMap = {};
        variants.forEach((v) => (variantMap[v._id.toString()] = v));

        variants = seenVariantIds
            .map((id) => variantMap[id.toString()])
            .filter(Boolean)
            .slice(0, 4);

        /* ----------------------------------------------------
           ✅ RULE 3: if seen < 4 => fill random to make 4
        -----------------------------------------------------*/
        if (variants.length < 4) {
            const need = 4 - variants.length;

            const excludeIds = variants.map((x) => x._id);

            const randomVariants = await Variant.aggregate([
                {
                    $match: {
                        is_deleted: false,
                        _id: { $nin: excludeIds },
                    },
                },
                { $sample: { size: need } },
            ]);

            const randomIds = randomVariants.map((v) => v._id);

            if (randomIds.length) {
                const randomFull = await Variant.find({ _id: { $in: randomIds } })
                    .populate([
                        {
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
                    ])
                    .lean();

                variants = [...variants, ...randomFull];
                seenVariantIds = [...variants.map((x) => x._id)];
            }
        }

        /* ----------------------------------------------------
           ✅ review_count + avg_stars for final variants
        -----------------------------------------------------*/
        const finalVariantIds = variants.map((v) => v._id);

        const reviewStats = await Review.aggregate([
            { $match: { variant: { $in: finalVariantIds } } },
            {
                $group: {
                    _id: "$variant",
                    count: { $sum: 1 },
                    avg_stars: { $avg: "$rating" },
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

        variants = variants.map((v) => ({
            ...v,
            review_count: reviewMap[v._id.toString()]?.review_count || 0,
            avg_stars: Number((reviewMap[v._id.toString()]?.avg_stars || 0).toFixed(1)),
        }));

        return res.json({
            success: 1,
            total: variants.length,
            data: variants,
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: 0, message: error.message });
    }
};

