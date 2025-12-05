const { Router } = require("express");
const { createProductWithVariants, getProducts, deleteProduct } = require("../src/controller/ProductController");
const Store = require("../src/middleware/Store");
const router = Router();
router.post('/', Store('image').fields(
    [
        { name: "productImages", maxCount: 20 },
        { name: "variantImages", maxCount: 100 }
    ]
), createProductWithVariants);
router.get('/', getProducts);
router.delete('/delete/:id', deleteProduct);
module.exports = router;