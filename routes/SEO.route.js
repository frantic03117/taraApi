const { Router } = require("express");
const { getSEOByPage, upsertSEO } = require("../src/controller/SeoTag.controller");
const { Auth } = require("../src/middleware/Auth");

const router = Router();
router.get('/show/:page_name', getSEOByPage);
router.post('/', Auth('Admin'), upsertSEO);
module.exports = router;