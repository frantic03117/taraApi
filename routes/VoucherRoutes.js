const { Router } = require("express");
const { Auth } = require("../src/middleware/Auth");
const { getVouchers, applyVoucher, deleteVoucher, createVoucher, toggleVoucherActive } = require("../src/controller/VoucherController");


const router = Router();
router.get('/', Auth(), getVouchers);
router.post('/', Auth(), createVoucher);
router.put("/activation/:id", toggleVoucherActive);
router.post('/apply', Auth(), applyVoucher);
router.delete('/delete/:id', Auth(), deleteVoucher);
module.exports = router;