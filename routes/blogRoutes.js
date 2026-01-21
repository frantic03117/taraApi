const { Router } = require("express");


const Store = require("../src/middleware/Store");
const { Auth } = require("../src/middleware/Auth");
const { get_blog, latest_blog, create_blog, update_blog, delete_blog } = require("../src/controller/BlogController");

const router = Router();
router.get('/', get_blog);
router.get('/latest', latest_blog);

router.post('/', Auth('Admin'), Store('image').fields(
    [
        { name: "banner", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]
), create_blog);
router.put('/update/:id', Auth('Admin'), Store('image').fields(
    [
        { name: "banner", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 }
    ]
), update_blog);
router.delete('/delete/:id', Auth('Admin'), delete_blog);
module.exports = router;