const express = require("express");
const { postContactUsDetails, getContactUsDetails, deleteContactUsMessages } = require("../controllers/contactUs");

const router = express.Router();

router.post("/", postContactUsDetails);
router.post("/delete", deleteContactUsMessages);
router.get("/", getContactUsDetails);


module.exports = router;
