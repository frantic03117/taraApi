const express = require("express");
const router = express.Router();
const { admin_login } = require("../src/controller/userController");
const { cashfreeWebhook, dashboard } = require("../src/controller/OrderController");
const { Auth } = require("../src/middleware/Auth");
const { saveConversionRate } = require("../src/controller/CurrencyConversion.controller");
router.post('/login', admin_login);
router.post('/webhook', express.raw({ type: 'application/json' }), cashfreeWebhook);
router.get('/dashboard', Auth(), dashboard)
router.post('/currency', saveConversionRate);
module.exports = router;