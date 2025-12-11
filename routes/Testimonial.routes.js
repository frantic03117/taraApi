const { Router } = require("express");
const { getTestimonials, createTestimonial, deleteTestimonial, updateTestimonial } = require("../src/controller/TestimonialController");
const Store = require("../src/middleware/Store");

const router = Router();
router.get('/', getTestimonials);
router.post('/', Store('any').single('file'), createTestimonial);
router.put('/update/:id', Store('any').single('file'), updateTestimonial);
router.delete('/delete/:id', deleteTestimonial);
module.exports = router;