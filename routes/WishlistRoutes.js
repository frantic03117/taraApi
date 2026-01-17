const router = require("express").Router();


const { addToWishlist, getWishlist, checkWishlist, removeFromWishlist } = require("../src/controller/WishlistController");
const { Auth } = require("../src/middleware/Auth");

router.post("/", Auth(), addToWishlist);
router.get("/", Auth(), getWishlist);
router.get("/check/:variantId", Auth(), checkWishlist);
router.delete("/:variantId", Auth(), removeFromWishlist);

module.exports = router;
