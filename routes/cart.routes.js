const { Router } = require("express");
const { GuestAuth } = require("../src/middleware/GuestAuth");
const { get_cart_items, add_to_cart, update_cart_quantity, remove_from_cart, add_multi_items_to_cart } = require("../src/controller/CartController");

const router = Router();
router.get('/', GuestAuth(), get_cart_items);
router.post('/', GuestAuth(), add_to_cart);
router.post('/multi', GuestAuth(), add_multi_items_to_cart);
router.put('/update/:cart_id', GuestAuth(), update_cart_quantity);
router.post('/delete/:cart_id', GuestAuth(), remove_from_cart);
module.exports = router;