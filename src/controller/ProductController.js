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
        const { variants, ...productData } = req.body;

        // Create product
        const product = new Product(productData);
        await product.save();

        // Create variants linked to product
        if (variants && variants.length > 0) {
            const variantDocs = variants.map((v) => ({
                ...v,
                product: product._id,
            }));

            await Variant.insertMany(variantDocs);
        }

        // Fetch product with variants
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
