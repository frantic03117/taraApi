const { Router } = require("express");
const { GuestAuth } = require("../src/middleware/GuestAuth");
const { create_order, list_orders } = require("../src/controller/OrderController");
const { Auth } = require("../src/middleware/Auth");

const router = Router();
router.post('/', GuestAuth(), create_order);
router.get('/', Auth('Admin'),list_orders);
module.exports = router;