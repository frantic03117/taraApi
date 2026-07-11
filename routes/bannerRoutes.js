const { Router } = require("express");
const Store = require("../src/middleware/Store");
const { getall, _create, update_banner, delete_banner } = require("../src/controller/BannerController");
const { Auth } = require("../src/middleware/Auth");
const router = Router();
router.get('/', getall);
router.post('/', Auth('Admin'), Store('any').single('image'), _create);
router.put('/update/:id', Auth('Admin'), update_banner);
router.delete('/:id', Auth('Admin'), delete_banner);
router.get('/test', (req, res) => {
    return res.json({success : 1, data : "CI CD works"});
})
module.exports = router;
