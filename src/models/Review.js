const { Schema, model } = require("mongoose");

const reviewSchema = new Schema(
    {
        // 🔹 Product reference
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },

        // 🔹 Variant reference (optional)
        variant: {
            type: Schema.Types.ObjectId,
            ref: "Variant",
            default: null,
        },

        // 🔹 User reference (optional for guest reviews)
        user: {
            type: Schema.Types.ObjectId,
            ref: "Users",
            default: null,
        },

        // 🔹 If guest review or user removed account
        name: {
            type: String,
            default: null,
            trim: true,
        },
        email: {
            type: String,
            default: null,
            lowercase: true,
            trim: true,
        },

        // ✅ if true -> frontend show "Anonymous"
        isAnonymous: {
            type: Boolean,
            default: false,
        },

        // ⭐ rating and comment
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        title: {
            type: String,
            default: null,
            trim: true,
        },
        review: {
            type: String,
            required: true,
            trim: true,
        },

        // optional images in review
        images: [
            {
                type: String,
            },
        ],

        // status
        is_active: {
            type: Boolean,
            default: true,
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

// ✅ helpful index
reviewSchema.index({ product: 1, variant: 1, user: 1 });

module.exports = model("Review", reviewSchema);
