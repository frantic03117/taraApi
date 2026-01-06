const { Schema, model, Types } = require("mongoose");
const createSlug = require("../services/createSlug");
const Product = require("./Product");
const ImageSchema = new Schema({
    image: String,
    title: String
});
const variantSchema = new Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",

        },
        slug: String,
        sku: { type: String, unique: true, },
        barcode: { type: String, default: null },
        variant_name: { type: String },
        color: { type: String },
        color_code: { type: String },
        size: { type: String },
        size_group: {
            type: Types.ObjectId,
            ref: "Setting",
            default: null
        },
        numeric_size: { type: Number },
        fabric: { type: String },
        material: { type: String },
        fabric_type: { type: String },
        gsm: { type: Number },
        transparency: { type: String },
        liner_material: { type: String },
        pattern: String,
        attributes: {
            type: Map,
            of: Schema.Types.Mixed,
            default: {}
        },
        images: [ImageSchema],
        video_url: { type: String },
        price: { type: Number, },
        sale_price: { type: Number },
        mrp: { type: Number },
        discount_percent: { type: Number },
        stock: { type: Number, default: 0 },
        in_stock: { type: Boolean, default: true },
        batch_number: { type: String },
        lot_number: { type: String },
        warehouse_location: { type: String },
        rack_number: { type: String },
        hsn_code: { type: String },
        is_active: { type: Boolean, default: true },
        is_deleted: { type: Boolean, default: false }
    },
    { timestamps: true }
);
variantSchema.pre("save", async function () {
    if (this.isNew || this.isModified("variant_name")) {

        const VariantModel = this.model("Variant");
        const ProductModel = this.model("Product");

        const product = await ProductModel.findById(this.product).select("slug");

        const baseSlug = createSlug(
            [
                product?.slug,
                this.variant_name,
                this.color,
                this.size
            ].filter(Boolean).join("-")
        );

        let slug = baseSlug;
        let count = 1;

        while (await VariantModel.exists({ slug })) {
            slug = `${baseSlug}-${count}`;
            count++;
        }

        this.slug = slug;
    }
});
variantSchema.pre("insertMany", async function (docs) {
    const Variant = model("Variant");


    for (const doc of docs) {
        if (!doc.variant_name) continue;

        const product = await Product
            .findById(doc.product)
            .select("slug");

        const baseSlug = createSlug(
            [
                product?.slug,
                doc.variant_name,
                doc.color,
                doc.size
            ].filter(Boolean).join("-")
        );

        let slug = baseSlug;
        let count = 1;

        while (await Variant.exists({ slug })) {
            slug = `${baseSlug}-${count}`;
            count++;
        }

        doc.slug = slug;
    }
});



module.exports = model("Variant", variantSchema);
