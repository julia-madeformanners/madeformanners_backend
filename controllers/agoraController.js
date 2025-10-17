const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
const axios = require("axios");
const mongoose = require("mongoose");
;

const APP_ID = process.env.AGORA_APP_ID;
const APP_CERTIFICATE = process.env.AGORA_APP_CERTIFICATE;
const CUSTOMER_ID = process.env.CUSTOMER_ID;
const CUSTOMER_SECRET = process.env.CUSTOMER_SECRET;

const basicAuth = Buffer.from(`${CUSTOMER_ID}:${CUSTOMER_SECRET}`).toString("base64");

const RecordingSchema = new mongoose.Schema({
  channelName: String,
  videoUrl: String,
  createdAt: { type: Date, default: Date.now },
  expiryDate: Date,
});

const Recording = mongoose.model("Recording", RecordingSchema);

// ==== Generate Token ====
exports.generateAgoraToken = (req, res) => {
  const { courseId, uid } = req.query;

  if (!courseId || !uid) return res.status(400).json({ error: "courseId and uid are required" });

  const channelName = `course_${courseId}`;
  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpireTs = currentTimestamp + expirationTimeInSeconds;

  try {
    const token = RtcTokenBuilder.buildTokenWithAccount(
      APP_ID,
      APP_CERTIFICATE,
      channelName,
      uid,
      role,
      privilegeExpireTs
    );
     
    res.json({ appID: APP_ID, token, channelName, uid, privilegeExpireTs });
  } catch (err) {
    console.error("❌ Error generating token:", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
};

// ==== Start Recording ====
exports.startRecording = async (req, res) => {
  const { channelName, uid, token } = req.body;

  try {
    const acquireRes = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/acquire`,
      { cname: channelName, uid: uid.toString(), clientRequest: {} },
      { headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" } }
    );

    const resourceId = acquireRes.data.resourceId;

    const startRes = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/mode/mix/start`,
      {
        cname: channelName,
        uid: uid.toString(),
        clientRequest: {
          token,
          recordingConfig: {
            channelType: 1,
            streamTypes: 2,
            videoStreamType: 0,
            maxIdleTime: 0,
            transcodingConfig: {
              width: 1280,
              height: 720,
              fps: 15,
              bitrate: 2260,
              mixedVideoLayout: 1,
            },
          },
          storageConfig: {
            vendor: 1, // AWS S3
            region: 0,
            bucket: "your-bucket-name",
            accessKey: "AWS_ACCESS_KEY",
            secretKey: "AWS_SECRET_KEY",
            fileNamePrefix: ["recordings", channelName],
          },
        },
      },
      { headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" } }
    );

    // Return the resourceId and sid so that we can stop the recording later
    res.json({ ...startRes.data, resourceId: resourceId, sid: startRes.data.sid });
  } catch (err) {
    console.error("❌ Error starting recording:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to start recording" });
  }
};

// ==== Stop Recording ====
exports.stopRecording = async (req, res) => {
  const { resourceId, sid, channelName } = req.body;

  try {
    const stopRes = await axios.post(
      `https://api.agora.io/v1/apps/${APP_ID}/cloud_recording/resourceid/${resourceId}/sid/${sid}/mode/mix/stop`,
      { cname: channelName, uid: "0", clientRequest: {} },
      { headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/json" } }
    );

    // Save fo 1 week 
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
 
    await Recording.create({
      channelName,
      videoUrl: stopRes.data.serverResponse.fileList[0],
      expiryDate,
    });

    res.json(stopRes.data);
  } catch (err) {
    console.error("❌ Error stopping recording:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to stop recording" });
  }
};

// ==== Get Available Recordings for Participants ====
exports.getRecordings = async (req, res) => {
  const { channelName } = req.params;
  const now = new Date();

  try {
    const recordings = await Recording.find({
      channelName,
      expiryDate: { $gte: now },
    });

    res.json(recordings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch recordings" });
  }
};
