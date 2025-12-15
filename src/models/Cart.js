const { Schema, default: mongoose } = require("mongoose");
const cartSchema = new Schema({
    cart_token: {
        type: String,
        default: null,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        default: null
    },
    variant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Variant',
        default: null
    },

    price: {
        type: Number
    },
    quantity: {
        type: Number
    },
    is_ordered: {
        type: Boolean,
        default: false
    },
    order_id: {
        type: String,
    },
    payment_link_generated_at: {
        type: Date,
        default: null,
    },
    user_address: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'UserAddress',
        default: null
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    }
}, { timestamps: true });
module.exports = new mongoose.model('Cart', cartSchema);