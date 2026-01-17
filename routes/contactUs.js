const express = require("express");
const { postContactUsDetails, getContactUsDetails, deleteContactMessages,  verifyContactEmail } = require("../controllers/contactUs");

const router = express.Router();

router.post("/", postContactUsDetails);
router.get("/", getContactUsDetails);
router.post("/delete", deleteContactMessages);
router.get("/verifyContactEmail", verifyContactEmail);

module.exports = router;
