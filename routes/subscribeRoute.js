const { Router } = require("express");
const { Auth } = require("../src/middleware/Auth");
const { listSubscriptions, createSubscription } = require("../src/controller/EmailSubscription.controller");

const router = Router();
router.get('/', Auth('Admin'), listSubscriptions);
router.post('/', createSubscription);
module.exports = router;