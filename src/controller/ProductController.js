const { Types } = require("mongoose");
const Product = require("../models/Product");
const Setting = require("../models/Setting");
const Variant = require("../models/Variant");
const fs = require("fs");
const path = require("path");

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
        // return res.json({ data: req.files || [] })
        let { variants, ...productData } = req.body;

        // Parse variants if sent as string
        if (typeof variants === "string") {
            variants = JSON.parse(variants);
        }

        /* ----------------------------------------------------
           SAVE PRODUCT IMAGES
        ---------------------------------------------------- */
        let productImages = [];
        if (req.files?.productImages) {
            productImages = req.files.productImages.map((file) => {
                return "/uploads/products/" + file.filename;
            });
        }
        productData.images = productImages;
        if (productData.seo_keywords) {
            productData.seo_keywords = productData.seo_keywords?.split(',')
        }
        // Save product first
        const product = new Product(productData);
        await product.save();
        const variantImagesFromFiles = req.files?.variantImages || [];
        const variantImageIndexes = req.body.variantImageIndex || [];
        const variantIndexes = Array.isArray(variantImageIndexes)
            ? variantImageIndexes
            : [variantImageIndexes];
        const variantImageMap = {};
        variantImagesFromFiles.forEach((file, i) => {
            const vIndex = parseInt(variantIndexes[i], 10);

            if (!variantImageMap[vIndex]) variantImageMap[vIndex] = [];

            variantImageMap[vIndex].push(file.path);
        });
        const variantDocs = variants.map((v, index) => ({
            ...v,
            images: variantImageMap[index] || [],
            product: product._id
        }));

        await Variant.insertMany(variantDocs);

        /* ----------------------------------------------------
           RETURN RESPONSE
        ---------------------------------------------------- */
        const createdProduct = await Product.findById(product._id).lean();
        const createdVariants = await Variant.find({ product: product._id }).lean();

        res.status(201).json({
            success: 1,
            data: {
                product: createdProduct,
                variants: createdVariants,
            },
            message: "Product with variants created successfully"
        });

    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: 0,
            message: error.message,
        });
    }
};
const isValidId = (id) => Types.ObjectId.isValid(id);

exports.getProducts = async (req, res) => {
    try {
        const {
            id,
            slug,
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
        if (id) {
            const findproduct = await Product.findOne({ _id: id });
            if (findproduct) {
                productFilter['_id'] = findproduct._id;
            }
        }
        if (search) {
            productFilter.title = { $regex: search, $options: "i" };
        }
        if (slug) {
            productFilter.slug = slug;
        }

        if (category && isValidId(category)) {
            productFilter.category = new Types.ObjectId(category);
        }

        if (sub_category && isValidId(sub_category)) {
            productFilter.sub_category = new Types.ObjectId(sub_category);
        }

        if (brand && isValidId(brand)) {
            productFilter.brand = new Types.ObjectId(brand);
        }

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
            // Populate sub category / brand names
            {
                $lookup: {
                    from: "settings",
                    localField: "sub_category",
                    foreignField: "_id",
                    as: "sub_category"
                }
            },
            { $unwind: { path: "$sub_category", preserveNullAndEmptyArrays: true } },

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
            success: 1,
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit),
            data: products
        });

    } catch (err) {
        // console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};
exports.deleteProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        // 1. Find the product
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        // 2. Delete product images
        if (product.images && product.images.length > 0) {
            product.images.forEach((imgPath) => {
                const filePath = path.join(__dirname, "..", imgPath);
                deleteFile(filePath);
            });
        }

        // 3. Find variants linked to product
        const variants = await Variant.find({ product: productId });

        // 4. Delete variant images
        variants.forEach((variant) => {
            if (variant.images && variant.images.length > 0) {
                variant.images.forEach((imgPath) => {
                    const filePath = path.join(__dirname, "..", imgPath);
                    deleteFile(filePath);
                });
            }
        });

        // 5. Delete variants from DB
        await Variant.deleteMany({ product: productId });

        // 6. Delete product from DB
        await Product.findByIdAndDelete(productId);

        res.json({
            success: true,
            message: "Product and all related variants deleted successfully",
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

// Utility file delete function
function deleteFile(filePath) {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.log("File not found or cannot delete:", filePath);
        } else {
            console.log("Deleted:", filePath);
        }
    });
}
exports.addProductVariant = async (req, res) => {
    const product_id = req.params;
    let variants = req.body.variants;
    variants = JSON.parse(variants);
    const variantImagesFromFiles = req.files?.variantImages || [];
    const variantImageIndexes = req.body.variantImageIndex || [];
    const variantIndexes = Array.isArray(variantImageIndexes)
        ? variantImageIndexes
        : [variantImageIndexes];
    const variantImageMap = {};
    variantImagesFromFiles.forEach((file, i) => {
        const vIndex = parseInt(variantIndexes[i], 10);

        if (!variantImageMap[vIndex]) variantImageMap[vIndex] = [];

        variantImageMap[vIndex].push(file.path);
    });
    const variantDocs = variants.map((v, index) => ({
        ...v,
        images: variantImageMap[index] || [],
        product: product_id
    }));

    await Variant.insertMany(variantDocs);
    return res.status(201).json({ success: 1, message: "Product Variant added successfully" });
}
exports.deleteProductVariant = async (req, res) => {
    try {
        const { variantId } = req.params;

        if (!variantId) {
            return res.status(400).json({
                success: false,
                message: "Variant ID is required",
            });
        }

        // Find variant
        const variant = await Variant.findById(variantId);

        if (!variant) {
            return res.status(404).json({
                success: false,
                message: "Variant not found",
            });
        }

        // Save product ID before deletion
        const productId = variant.product;

        // Delete images (optional)
        if (variant.images && variant.images.length > 0) {
            variant.images.forEach((img) => {
                const fs = require("fs");
                try {
                    fs.unlinkSync(img); // remove file
                } catch (err) {
                    console.log("Image delete failed:", img);
                }
            });
        }

        // Remove variant
        await Variant.findByIdAndDelete(variantId);

        // OPTIONAL: If no variants remain, delete product automatically
        // const variantCount = await Variant.countDocuments({ product: productId });
        // if (variantCount === 0) {
        //     await Product.findByIdAndDelete(productId);
        // }

        res.json({
            success: true,
            message: "Variant deleted successfully",
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.addVariantImages = async (req, res) => {
    try {
        const { variantId } = req.params;
        const files = req.files.variantImages
        // return res.json({ success: 0, data: files })
        if (!variantId) {
            return res.status(400).json({
                success: false,
                message: "Variant ID is required",
            });
        }

        const variant = await Variant.findById(variantId);
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: "Variant not found",
            });
        }

        // Collect uploaded image paths
        const uploadedImages = files.map(file => {
            return file.path;
        });

        // Append new images
        variant.images.push(...uploadedImages);

        await variant.save();

        res.json({
            success: true,
            message: "Variant images added successfully",
            data: variant
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.deleteVariantImage = async (req, res) => {
    try {
        const { variantId } = req.params;
        const image = req.body.image;
        if (!variantId || !image) {
            return res.status(400).json({
                success: false,
                message: "Variant ID and image path are required",
            });
        }

        const variant = await Variant.findById(variantId);
        if (!variant) {
            return res.status(404).json({
                success: false,
                message: "Variant not found",
            });
        }

        // Check image exists in variant
        const imageIndex = variant.images.indexOf(image);
        if (imageIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Image not found in variant",
            });
        }

        // Remove from DB array
        variant.images.splice(imageIndex, 1);

        // Delete image file (optional)
        try {
            const fs = require("fs");
            fs.unlinkSync(image.replace(/^\//, "")); // remove leading slash
        } catch (err) {
            console.log("Image delete failed:", err);
        }

        await variant.save();

        res.json({
            success: true,
            message: "Variant image deleted successfully",
            data: variant
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
exports.variantList = async (req, res) => {
    try {
        let {
            id,
            page = 1,
            limit = 20,
            search = "",
            sort = "-createdAt",
            productId,
            in_stock,
            is_active,
            nav_menu,
            category_slug,
            sub_category_slug,
            ...dynamicFilters
        } = req.query;

        page = parseInt(page);
        limit = parseInt(limit);

        const filter = { is_deleted: false };

        /* ----------------------------------------------
           BASE SEARCH FILTER
        -------------------------------------------------- */
        if (search) {
            filter.$or = [
                { variant_name: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } },
                { color: { $regex: search, $options: "i" } },
                { size: { $regex: search, $options: "i" } },
                { barcode: { $regex: search, $options: "i" } }
            ];
        }

        /* ----------------------------------------------
           DIRECT VARIANT FILTERS
        -------------------------------------------------- */
        if (productId) filter.product = productId;
        if (in_stock !== undefined) filter.in_stock = in_stock === "true";
        if (is_active !== undefined) filter.is_active = is_active === "true";
        if (id) filter["_id"] = id;

        /* ----------------------------------------------
           CATEGORY / MENU FILTERS
        -------------------------------------------------- */

        // NAV MENU -> CATEGORY -> PRODUCT -> VARIANT
        if (nav_menu) {
            const categories = await Setting.find(
                { parent: nav_menu, type: "category" },
                "_id"
            );

            const categoryIds = categories.map(c => c._id);

            const products = await Product.find(
                { category: { $in: categoryIds }, is_deleted: false },
                "_id"
            );

            filter.product = { $in: products.map(p => p._id) };
        }

        // CATEGORY SLUG
        if (category_slug) {
            const cats = await Setting.find({
                type: "category",
                slug: category_slug
            });

            const products = await Product.find(
                { category: { $in: cats.map(c => c._id) }, is_deleted: false },
                "_id"
            );

            filter.product = { $in: products.map(p => p._id) };
        }

        // SUBCATEGORY SLUG
        if (category_slug && sub_category_slug) {
            const subcats = await Setting.find({
                type: "sub-category",
                slug: sub_category_slug
            });

            const products = await Product.find(
                { sub_category: { $in: subcats.map(c => c._id) }, is_deleted: false },
                "_id"
            );

            filter.product = { $in: products.map(p => p._id) };
        }

        /* ----------------------------------------------
           DYNAMIC VARIANT FILTERS
           Example:
           /variant-list?color=Red&size=M&fabric=Cotton
        -------------------------------------------------- */
        const selectableFields = [
            "color",
            "color_code",
            "size",
            "fabric",
            "material",
            "fabric_type",
            "gsm",
            "transparency",
            "liner_material",
            "attributes"
        ];

        for (let key in dynamicFilters) {
            if (selectableFields.includes(key)) {
                // Multi-value filter → comma separated: Red,Blue,Green
                const values = dynamicFilters[key].split(",");
                filter[key] = { $in: values };
            }
        }

        /* ----------------------------------------------
           EXECUTE QUERY
        -------------------------------------------------- */
        const skip = (page - 1) * limit;

        const [variants, total] = await Promise.all([
            Variant.find(filter)
                .populate([
                    {
                        path: "product",
                        select: "name images category title slug",
                        populate: {
                            path: "category",
                            select: "parent title slug file",
                            populate: {
                                path: "parent",
                                select: " title slug file"
                            }
                        }
                    }
                ])
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
            Variant.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            data: variants,
            filter,
            pagination: {
                page,
                limit,
                total,
                totalPages
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: 0,
            message: error.message,
        });
    }
};

exports.updateVariant = async (req, res) => {
    try {
        const { variantId } = req.params;

        if (!variantId) {
            return res.status(400).json({
                success: 0,
                message: "Variant ID is required",
            });
        }

        const variant = await Variant.findById(variantId);
        if (!variant) {
            return res.status(404).json({
                success: 0,
                message: "Variant not found",
            });
        }

        // Data coming from body
        let data = { ...req.body };

        /** -----------------------------------------
         * HANDLE EXISTING IMAGES
         * User may send:
         *   existingImages: ["url1","url2"]
         *   (to keep those images)
         ------------------------------------------ */
        let existingImages = variant.images;

        if (data.existingImages) {
            try {
                existingImages = JSON.parse(data.existingImages);
            } catch {
                existingImages = Array.isArray(data.existingImages)
                    ? data.existingImages
                    : [data.existingImages];
            }
        }

        /** -----------------------------------------
         * HANDLE NEW IMAGE UPLOADS
         ------------------------------------------ */
        let newImages = [];

        if (req.files && req.files.length > 0) {
            newImages = req.files.map((file) = file.path);
        }

        // Combine existing + new images
        data.images = [...existingImages, ...newImages];

        // Update variant
        const updated = await Variant.findByIdAndUpdate(variantId, data, {
            new: true,
            runValidators: true,
        });

        res.json({
            success: 1,
            message: "Variant updated successfully",
            data: updated,
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: 0,
            message: error.message,
        });
    }
};

exports.filters_matrix = async (req, res) => {

    try {
        const colors = await Variant.distinct("color", {
            is_deleted: false
        });
        const materials = await Variant.distinct("material", {
            is_deleted: false
        });
        const fabrics = await Variant.distinct("fabric", {
            is_deleted: false
        });
        const patterns = await Variant.distinct("pattern", {
            is_deleted: false
        });

        res.json({
            success: 1,
            data: {
                color: colors,
                material: materials,
                fabric: fabrics,
                pattern: patterns
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }


}