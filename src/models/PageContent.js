const { Schema, model } = require("mongoose");

const contentBlockSchema = new Schema({
    title: {
        type: String,
        default: ""
    },
    subtitle: {
        type: String,
        default: ""
    },
    description: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    imageAlt: {
        type: String,
        default: ""
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { _id: true });

const schema = new Schema({
    pageName: {
        type: String,
        required: true,
        enum: ['about', 'home', 'contact', 'policy'],
        lowercase: true
    },
    sectionName: {
        type: String,
        required: true
    },
    sectionSlug: {
        type: String,
        lowercase: true
    },
    sectionTitle: {
        type: String,
        required: true
    },
    sectionDescription: {
        type: String,
        default: ""
    },
    contentType: {
        type: String,
        enum: ['text', 'image', 'text-image', 'carousel', 'gallery', 'team-member'],
        default: 'text-image'
    },
    contentBlocks: [contentBlockSchema],
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Compound index for unique page sections
schema.index({ pageName: 1, sectionSlug: 1 }, { unique: false });

module.exports = model('PageContent', schema);
