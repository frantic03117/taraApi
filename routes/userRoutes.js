const { Router } = require("express");
const { Auth } = require("../src/middleware/Auth");
const Store = require("../src/middleware/Store");
const { send_otp, verify_otp, store_profile, update_profile, user_list } = require("../src/controller/userController");
const { list_orders } = require("../src/controller/OrderController");

const router = Router();
router.post('/send-otp', send_otp);
router.get('/', Auth(), user_list);
router.post('/verify-otp', verify_otp);
router.get('/order', Auth('User'), list_orders);
router.post('/register', Store('image').fields([
    {
        name: "profile_image", maxCount: 1
    }
]), store_profile);
router.put('/update', Auth(), Store('image').fields([
    {
        name: "profile_image", maxCount: 1
    }
]), update_profile);
module.exports = router;