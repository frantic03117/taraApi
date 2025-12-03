const { Router } = require("express");
const { createProductWithVariants } = require("../src/controller/ProductController");
const router = Router();
router.post('/', createProductWithVariants);
module.exports = router;