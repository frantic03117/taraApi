const { Router } = require("express");
const { Auth } = require("../src/middleware/Auth");
const { get_setting, create_setting, update_setting, delete_setting, menubar_web } = require("../src/controller/SettingController");
const Store = require("../src/middleware/Store");

const router = Router();
router.get('/', get_setting);
router.get('/menu', menubar_web);
router.post('/', Auth('Admin'), Store('any').single('file'), create_setting);
router.put('/update/:id', Auth('Admin'), Store('any').single('file'), update_setting);
router.delete('/delete/:id', Auth('Admin'), delete_setting);
module.exports = router;