const express = require("express");
const { registerUser, loginUser, updateUser, uploadVideoLink , deleteUser} = require("../controllers/userController");
const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.put("/:id", updateUser);
router.post("/editUserCourses", uploadVideoLink);
router.delete("/deleteUser/:id", deleteUser);

module.exports = router;
