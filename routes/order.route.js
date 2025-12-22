const { Router } = require("express");
const { GuestAuth } = require("../src/middleware/GuestAuth");
const { create_order, list_orders, fetch_single_order } = require("../src/controller/OrderController");
const { Auth } = require("../src/middleware/Auth");

const router = Router();
router.post('/', GuestAuth(), create_order);
router.get('/', Auth('Admin'), list_orders);
router.get('/show/:order_id', fetch_single_order);
module.exports = router;