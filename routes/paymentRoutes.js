const express = require("express");
const { createCheckoutSession, updateUserCourseStatus, verifyPayment } = require("../controllers/paymentController");

const router = express.Router();

router.post("/create-checkout-session", createCheckoutSession);
router.post("/verify-payment", verifyPayment);
router.post("/UserCoursesStatus", updateUserCourseStatus);


module.exports = router;
