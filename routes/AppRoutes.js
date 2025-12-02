const { Router } = require("express");
const { admin_login } = require("../src/controller/userController");

const router = Router();
router.post('/login', admin_login);
module.exports = router;