const { Router } = require("express");
const { Auth } = require("../src/middleware/Auth");
const { getVouchers, updateActivation, applyVoucher, deleteVoucher, createVoucher } = require("../src/controller/VoucherController");


const router = Router();
router.get('/', Auth(), getVouchers);
router.post('/', Auth(), createVoucher);
router.post('/activation/:id', Auth, updateActivation);
router.post('/apply', Auth(), applyVoucher);
router.delete('/delete/:id', Auth(), deleteVoucher);
module.exports = router;