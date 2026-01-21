const express = require('express');
const { server, app } = require('./app');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const mongourl = "mongodb+srv://franticnoida2016:franticnoida2016@cluster0.9n1kpyn.mongodb.net/taraapi";
mongoose.connect(mongourl);
const database = mongoose.connection;
database.on('connected', () => {
    console.log('Database connected');
})
database.on('error', (err) => {
    console.error('Database connection error:', err);
});
database.on('disconnected', () => {
    console.log('Database disconnected');
});
process.env.TZ = "Asia/Kolkata";
const port = 6300;
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.get('/', (req, res) => res.send('Tara ecommerce api started successfully.'));
const bannerRoute = require('./routes/bannerRoutes');
const settingRoute = require('./routes/settingRoute');
const userRoute = require('./routes/userRoutes');
const appRoute = require('./routes/AppRoutes');
const productRoute = require('./routes/productRoute');
const offerRoute = require('./routes/offer.routes');
const testroute = require('./routes/Testimonial.routes');
const cartroute = require('./routes/cart.routes');
const voucherRoute = require('./routes/VoucherRoutes');
const orderroute = require('./routes/order.route');
const shippingroute = require('./routes/shiprocket.routes');
const seoroute = require('./routes/SEO.route');
const voucherorute = require('./routes/VoucherRoutes');
const blogroutes = require('./routes/blogRoutes');
const reviewroutes = require('./routes/reviewRoutes');
const wishlistroutes = require('./routes/WishlistRoutes');
const subscribeRoute = require('./routes/subscribeRoute');




app.use('/api/v1/banner', bannerRoute);
app.use('/api/v1/setting', settingRoute);
app.use('/api/v1/user', userRoute);
app.use('/api/v1/app', appRoute);
app.use('/api/v1/product', productRoute);
app.use('/api/v1/offer', offerRoute);
app.use('/api/v1/testimonial', testroute);
app.use('/api/v1/cart', cartroute);
app.use('/api/v1/promo-code', voucherRoute);
app.use('/api/v1/order', orderroute);
app.use('/api/v1/shipping', shippingroute);
app.use('/api/v1/seo', seoroute);
app.use('/api/v1/voucher', voucherorute);
app.use('/api/v1/blog', blogroutes);
app.use('/api/v1/review', reviewroutes);
app.use('/api/v1/wishlist', wishlistroutes);
app.use('/api/v1/subscribe', subscribeRoute);






server.listen(port, () => {
    console.log(`Tara ecommerce api started at https://localhost:${port}`);
});