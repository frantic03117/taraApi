const { Router } = require("express");
const { createProductWithVariants, getProducts } = require("../src/controller/ProductController");
const Store = require("../src/middleware/Store");
const router = Router();
router.post('/', Store('image').any(),  createProductWithVariants);
router.get('/',   getProducts);
module.exports = router;