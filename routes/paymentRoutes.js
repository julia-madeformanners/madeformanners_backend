const express = require("express");
const { createCheckoutSession, updateUserCourseStatus } = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-checkout-session", createCheckoutSession);
router.post("/UserCoursesStatus", updateUserCourseStatus);

module.exports = router;
