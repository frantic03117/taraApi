const { Router } = require("express");
const { Auth } = require("../src/middleware/Auth");
const { getVouchers, applyVoucher, deleteVoucher, createVoucher, toggleVoucherActive } = require("../src/controller/VoucherController");
const { GuestAuth } = require("../src/middleware/GuestAuth");


const router = Router();
router.get('/', Auth(), getVouchers);
router.post('/', Auth('Admin'), createVoucher);
router.put("/activation/:id", toggleVoucherActive);
router.post('/apply', GuestAuth(), applyVoucher);
router.delete('/delete/:id', Auth(), deleteVoucher);
module.exports = router;