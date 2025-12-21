const { Router } = require("express");
const { admin_login } = require("../src/controller/userController");
const { cashfreeWebhook } = require("../src/controller/OrderController");

const router = Router();
router.post('/login', admin_login);
router.post('/webhook', cashfreeWebhook);
module.exports = router;