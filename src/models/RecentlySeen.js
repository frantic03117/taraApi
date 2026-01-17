const mongoose = require("mongoose");

const RecentlySeenSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "Users", default: null },
        cart_token: { type: String, default: null },

        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },

        seenAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

RecentlySeenSchema.index({ user: 1, product: 1 });
RecentlySeenSchema.index({ cart_token: 1, product: 1 });

module.exports = mongoose.model("RecentlySeen", RecentlySeenSchema);
