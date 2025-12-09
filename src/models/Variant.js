const { Schema, model } = require("mongoose");

const variantSchema = new Schema(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",

        },

        sku: { type: String, unique: true, },
        barcode: { type: String, default: null },
        variant_name: { type: String },
        color: { type: String },
        color_code: { type: String },
        size: { type: String },
        size_group: { type: String },
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
        images: [String],
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

module.exports = model("Variant", variantSchema);
