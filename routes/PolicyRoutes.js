const { Router } = require("express");

const { Auth } = require("../src/middleware/Auth");
const { get_policies, _create } = require("../src/controller/PolicyController");

const router = Router();
router.get('/', get_policies);
router.post('/', Auth('Admin'), _create);
module.exports = router;