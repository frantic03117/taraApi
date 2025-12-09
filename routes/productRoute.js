const { Router } = require("express");
const { createProductWithVariants, getProducts, deleteProduct, addProductVariant, addVariantImages, deleteProductVariant, variantList, deleteVariantImage, updateVariant, filters_matrix } = require("../src/controller/ProductController");
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
router.post('/variant/create/:product_id', Store('image').fields(
    [
        { name: "productImages", maxCount: 20 },
        { name: "variantImages", maxCount: 100 }
    ]
), addProductVariant);
router.post('/variant/images/:variantId', Store('image').fields(
    [
        { name: "productImages", maxCount: 20 },
        { name: "variantImages", maxCount: 100 }
    ]
), addVariantImages);
router.delete('/variant/delete/:variantId', deleteProductVariant);
router.post('/variant/image/delete/:variantId', deleteVariantImage);
router.get('/variants', variantList);
router.get('/filter-matrix', filters_matrix);
router.put('/variant/update/:variantId', Store('image').any(), updateVariant)
module.exports = router;