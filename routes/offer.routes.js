const { Router } = require("express");
const { createOffer, listOffers, updateOffer, deleteOffer } = require("../src/controller/Offer.controller");
const Store = require("../src/middleware/Store");

const router = Router();
router.get('/', listOffers);
router.post('/', Store('image').single('offer_banner'), createOffer);
router.put('/update/:id', Store('image').single('offer_banner'), updateOffer);
router.delete('/delete/:id', deleteOffer);
module.exports = router;