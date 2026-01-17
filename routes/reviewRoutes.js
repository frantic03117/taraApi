const { addReview, getReviewsByProduct, updateReview, deleteReview, adminReviewList } = require("../src/controller/ReviewController");

const router = require("express").Router();


// ✅ ADD REVIEW
router.post("/", addReview);

// ✅ GET REVIEWS (by product / variant)
router.get("/", getReviewsByProduct);

router.get("/admin", adminReviewList);

// ✅ UPDATE REVIEW
router.put("/update", updateReview);

// ✅ DELETE REVIEW (soft delete)
router.delete("/delete", deleteReview);

module.exports = router;
