const express = require("express");
const router = express.Router();
const { admin_login } = require("../src/controller/userController");
const { cashfreeWebhook, dashboard } = require("../src/controller/OrderController");
router.post('/login', admin_login);
router.post('/webhook', express.raw({ type: 'application/json' }), cashfreeWebhook);
router.get('dashboard', dashboard)
module.exports = router;