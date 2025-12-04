const Product = require("../models/Product");
const Variant = require("../models/Variant");

/**
 * Create a product with variants
 * Expected request body:
 * {
 *   "slug": "tshirt-red",
 *   "title": "Red T-Shirt",
 *   "category": "64f8b6c1a2f1a2c123456789",
 *   "description": "High quality cotton T-shirt",
 *   "images": ["url1", "url2"],
 *   "variants": [
 *      {
 *         "sku": "TSHIRT-RED-M",
 *         "price": 499,
 *         "sale_price": 399,
 *         "stock_qty": 50,
 *         "images": ["variant1.jpg", "variant2.jpg"],
 *         "attributes": {
 *            "color": "Red",
 *            "size": "M",
 *            "fabric": "Cotton",
 *            "fit": "Regular",
 *            "sleeve": "Half Sleeve"
 *         }
 *      },
 *      {... another variant ...}
 *   ]
 * }
 */
exports.createProductWithVariants = async (req, res) => {
    try {
        let { variants, ...productData } = req.body;
        // Parse JSON if needed
        if (typeof variants === "string") {
            variants = JSON.parse(variants);
        }
        // Save product images
        let productImages = [];
        if (req.files.productImages) {
            productImages = req.files.productImages.map((file) => {
                return "/uploads/products/" + file.filename;
            });
        }
        productData.images = productImages;
        // Create product
        const product = new Product(productData);
        await product.save();
        // Handle variants
        const variantDocs = [];
        for (let i = 0; i < variants.length; i++) {
            const v = variants[i];
            // Variant images
            let variantImages = [];
            const key = `variant_${i}_images`;

            if (req.files[key] && req.files[key].length > 0) {
                variantImages = req.files[key].map((file) => {
                    return "/uploads/variants/" + file.filename;
                });
            }

            variantDocs.push({
                ...v,
                images: variantImages,
                product: product._id,
            });
        }

        await Variant.insertMany(variantDocs);

        const createdProduct = await Product.findById(product._id).lean();
        const createdVariants = await Variant.find({ product: product._id }).lean();

        res.status(201).json({
            success: true,
            data: {
                product: createdProduct,
                variants: createdVariants,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
};
exports.getProducts = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 12,
            search = "",
            category,
            sub_category,
            brand,
            min_price,
            max_price,
            color,
            size,
            fabric,
            material,
            tags
        } = req.query;
        const skip = (page - 1) * limit;
        let productFilter = { is_deleted: false, is_active: true };
        if (search) {
            productFilter.title = { $regex: search, $options: "i" };
        }
        if (category) productFilter.category = category;
        if (sub_category) productFilter.sub_category = sub_category;
        if (brand) productFilter.brand = brand;
        if (tags) {
            productFilter.tags = { $in: tags.split(",") };
        }
        let variantFilter = {};
        if (min_price || max_price) {
            variantFilter.sale_price = {};
            if (min_price) variantFilter.sale_price.$gte = Number(min_price);
            if (max_price) variantFilter.sale_price.$lte = Number(max_price);
        }
        if (color) variantFilter["attributes.color"] = color;
        if (size) variantFilter["attributes.size"] = size;
        if (fabric) variantFilter["attributes.fabric"] = fabric;
        if (material) variantFilter["attributes.material"] = material;

        // -----------------------------
        // 3. Aggregation Pipeline
        // -----------------------------
        const pipeline = [
            { $match: productFilter },

            // Join Variants
            {
                $lookup: {
                    from: "variants",
                    localField: "_id",
                    foreignField: "product",
                    as: "variants"
                }
            },

            // Apply variant filters
            {
                $addFields: {
                    variants: {
                        $filter: {
                            input: "$variants",
                            as: "v",
                            cond: {
                                $and: Object.entries(variantFilter).map(([key, value]) => ({
                                    $eq: [`$$v.${key}`, value]
                                }))
                            }
                        }
                    }
                }
            },

            // Remove products with no matching variants
            { $match: { variants: { $ne: [] } } },

            // Pagination
            { $skip: skip },
            { $limit: Number(limit) },

            // Populate category / brand names
            {
                $lookup: {
                    from: "settings",
                    localField: "category",
                    foreignField: "_id",
                    as: "category"
                }
            },
            { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },

            {
                $lookup: {
                    from: "settings",
                    localField: "brand",
                    foreignField: "_id",
                    as: "brand"
                }
            },
            { $unwind: { path: "$brand", preserveNullAndEmptyArrays: true } }
        ];

        // -----------------------------
        // 4. Run query
        // -----------------------------
        const products = await Product.aggregate(pipeline);

        // Count total (without pagination)
        const totalCountPipeline = [...pipeline];
        totalCountPipeline.pop(); // remove limit
        totalCountPipeline.pop(); // remove skip

        const totalResults = await Product.aggregate(totalCountPipeline);
        const total = totalResults.length;

        return res.json({
            success: true,
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit),
            products
        });

    } catch (err) {
        // console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

