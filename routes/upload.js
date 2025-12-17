const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");


cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});


const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 * 2 }, // 2GB
});


function uploadToCloudinary(buffer, folder, resource_type = "auto") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
}


async function uploadMiddleware(req, res, next) {
  if (!req.file) return next();

  let folder = "uploads";
  if (req.file.mimetype.startsWith("image/")) folder = "user_images";
  if (req.file.mimetype.startsWith("video/")) folder = "course_videos";

  try {
    const result = await uploadToCloudinary(req.file.buffer, folder);
   
    req.file.cloudinaryUrl = result.secure_url;
    req.file.cloudinaryId = result.public_id;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed", error: err.message });
  }
}
module.exports = { upload, uploadMiddleware };
