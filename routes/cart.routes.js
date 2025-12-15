const { Router } = require("express");
const { GuestAuth } = require("../src/middleware/GuestAuth");
const { get_cart_items, add_to_cart, update_cart_quantity, remove_from_cart } = require("../src/controller/CartController");

const router = Router();
router.get('/', GuestAuth(), get_cart_items);
router.post('/', GuestAuth(), add_to_cart);
router.put('/update', GuestAuth(), update_cart_quantity);
router.post('/delete', GuestAuth(), remove_from_cart);
module.exports = router;