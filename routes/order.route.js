const { Router } = require("express");
const { GuestAuth } = require("../src/middleware/GuestAuth");
const { create_order } = require("../src/controller/OrderController");

const router = Router();
router.post('/', GuestAuth(), create_order);
module.exports = router;