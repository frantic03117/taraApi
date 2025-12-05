const { Schema, model } = require("mongoose");

const productSchema = new Schema({
    slug: String,
    title: String,
    category: {
        type: Schema.Types.ObjectId,
        ref: "Setting",
    },
    sub_category: {
        type: Schema.Types.ObjectId,
        ref: "Setting",
        default: null,
    },
    brand: {
        type: Schema.Types.ObjectId,
        ref: "Setting",
        default: null,
    },
    thumbnail: {
        type: String,
        default: null,
    },
    tags: [String],
    short_description: {
        type: String,
        default: null,
    },
    description: {
        type: String,
        default: null,
    },
    wash: { type: String },
    wash_care: { type: String },
    care_instructions: { type: String },
    weight: { type: Number },
    height: { type: Number },
    width: { type: Number },
    depth: { type: Number },
    package_dimensions: { type: String },
    package_weight: { type: Number },
    gender: { type: String },
    age_group: { type: String },
    season: { type: String },
    occasion: { type: String },
    style: { type: String },
    climate: { type: String },           // winter, summer
    activity_type: { type: String },     // sports, casual
    pack_of: { type: Number },
    multipack: { type: Boolean },
    box_contents: { type: String },
    gst_percentage: { type: Number },
    certification: { type: String },
    fire_resistant: { type: Boolean },
    uv_protection: { type: Boolean },
    barcode: {
        type: String,
        default: null,
    },
    seo_title: String,
    seo_description: String,
    seo_keywords: [String],
    is_active: {
        type: Boolean,
        default: true,
    },
    is_deleted: {
        type: Boolean,
        default: false,
    },
}, { timestamps: true });
function createSlug(title) {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")   // remove special chars
        .replace(/\s+/g, "-")           // replace spaces with -
        .replace(/-+/g, "-");           // collapse multiple -
}
productSchema.pre("save", async function () {
    if (this.isNew || this.isModified("title")) {

        const Product = model("Product");

        let baseSlug = createSlug(this.title);
        let slug = baseSlug;
        let count = 1;

        while (await Product.exists({ slug })) {
            slug = `${baseSlug}-${count}`;
            count++;
        }

        this.slug = slug;
    }
});

module.exports = new model('Product', productSchema);