const express = require("express");
const { postContactUsDetails, getContactUsDetails } = require("../controllers/contactUs");

const router = express.Router();

router.post("/", postContactUsDetails);
router.get("/", getContactUsDetails);

module.exports = router;
