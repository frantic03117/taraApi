const { bulkShipmentUpload } = require("../src/controller/bulkShipment.controller");
const { createShipment, generateAWB, requestPickup, trackShipment, cancelShipment, getBestCourier, bulkLabelDownload } = require("../src/controller/shiprocket.controller");
const Store = require("../src/middleware/Store");

const router = require("express").Router();

router.post("/create-order", createShipment);
router.post("/generate-awb", generateAWB);
router.post("/pickup", requestPickup);
router.get("/track/:shipment_id", trackShipment);
router.post("/cancel", cancelShipment);
router.get('/best-courier', getBestCourier);
router.post('/label-url', bulkLabelDownload);
router.post(
  '/bulk-upload',
  Store('any').single('file'),
  bulkShipmentUpload
);

module.exports = router;
