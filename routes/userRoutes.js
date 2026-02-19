const express = require("express");
const { registerUser, loginUser, updateUser, uploadVideoLink , deleteUser , getUser,upload} = require("../controllers/userController");
const router = express.Router();

router.get("/:id", getUser);
/**
 * @swagger
 * /register:
 *   post:
 *     summary: User Register
 *     responses:
 *       200:
 *         description: succsess
 */
router.post("/register",  upload.single("img"), registerUser);
router.post("/login", loginUser);
router.put("/:id", updateUser);
router.post("/editUserCourses", uploadVideoLink);
router.delete("/deleteUser/:id", deleteUser);

module.exports = router;
