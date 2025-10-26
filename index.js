const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const cron = require("node-cron")
const { Server } = require("socket.io");
const sitemapRouter = require("./routes/sitemap");
require('dotenv').config();

const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const agoraRoutes = require("./routes/agoraRoutes");
const contactUs = require('./routes/contactUs')
const { User, Course } = require("./data");
const deleteAllUsers = async () => {
  try {
    await User.deleteMany({});
    console.log("user deleted");
  } catch (err) {
    console.error("user delete erorr", err);
  }
};
const deleteAllCourses = async () => {
  try {
    await Course.deleteMany({});
    console.log("courses deleted");
  } catch (err) {
    console.error("courses delete error ", err);
  }
};
const app = express();
const allowedOrigins = [
  "http://localhost:3000",
  "https://madeformanners.com",
  "https://www.madeformanners.com"
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "5gb" }));
app.use(express.urlencoded({ limit: "5gb", extended: true }));
app.use("/", sitemapRouter);
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to MongoDB");
    // deleteAllUsers();
    //  deleteAllCourses()
    // حذف كل الـ collections داخل القاعدة
    // const collections = await mongoose.connection.db.collections();
    // for (let collection of collections) {
    //   await collection.deleteMany({});
    //   console.log(`Cleared collection: ${collection.namespace}`);
    // }

    // console.log("✅ All data deleted (collections emptied)");
    // process.exit();
  })
  .catch((err) => console.error("MongoDB connection failed", err));

// mongoose.connect("mongodb+srv://iulianaesanu28:julia28@cluster0.z7ubmle.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
//   .then(() => 
//     {
//     console.log("Connected to MongoDB"); 
//     // deleteAllUsers(); deleteAllCourses()
//   })
//   .catch((err) => console.error("MongoDB connection failed", err));

cron.schedule("0 0 * * *", async () => { 
  try {
   
    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;

    // delete after 1 week
    const courses = await Course.find();

    for (const course of courses) {
      if (!course.date) continue; 

      const courseDate = new Date(course.date);
      const expireDate = new Date(courseDate.getTime() + oneWeek);

      if (expireDate <= now) {
      
        await Course.findByIdAndDelete(course._id);
      }
    }

   
    const users = await User.find();

    for (const user of users) {
      const filteredCourses = user.courses.filter(c => {
        if (!c.date) return true; 
        const courseDate = new Date(c.date);
        const expireDate = new Date(courseDate.getTime() + oneWeek);
        return expireDate > now; 
      });

      if (filteredCourses.length !== user.courses.length) {
        user.courses = filteredCourses;
        await user.save();
       
      }
    }

    console.log("✅ Cron cleanup completed.\n");
  } catch (err) {
    console.error("❌ Cron error:", err);
  }
});
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/agora", agoraRoutes);
app.use("/api/contactUs", contactUs);


const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  let currentCourseId = null;
  socket.on("joinCourseRoom", (courseId) => {
    socket.join(courseId);
    currentCourseId = courseId;
    console.log(`User ${socket.id} joined course ${courseId}`);
  });


  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
