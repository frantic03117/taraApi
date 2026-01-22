const express = require("express");
const router = express.Router();

const {
    createContact,
    getContacts,
    getContactById,
    deleteContact,
} = require("../src/controller/ContactController");

router.post("/", createContact);
router.get("/", getContacts);
router.get("/:id", getContactById);
router.delete("/:id", deleteContact);

module.exports = router;
