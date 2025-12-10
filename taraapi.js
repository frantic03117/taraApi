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
app.use('/api/v1/banner', bannerRoute);
app.use('/api/v1/setting', settingRoute);
app.use('/api/v1/user', userRoute);
app.use('/api/v1/app', appRoute);
app.use('/api/v1/product', productRoute);
app.use('/api/v1/offer', offerRoute);


server.listen(port, () => {
    console.log(`Tara ecommerce api started at https://localhost:${port}`);
});