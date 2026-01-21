const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Users",
            required: true,
            index: true,
        },

        // ✅ store variant id (recommended)
        variant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Variant",
            required: true,
            index: true,
        },

        // optional: keep product also for fast filtering (optional)
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            default: null,
            index: true,
        },
    },
    { timestamps: true }
);

// ✅ user cannot add same variant twice
wishlistSchema.index({ user: 1, variant: 1 }, { unique: true });

module.exports = mongoose.model("Wishlist", wishlistSchema);
