const express = require("express");
const { generateAgoraToken, startRecording } = require("../controllers/agoraController");

const router = express.Router();

router.get("/agora-token", generateAgoraToken);
router.post("/startRecording",startRecording);


module.exports = router;
