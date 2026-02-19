const mongoose = require('mongoose');

// Sub-schema
const courseSubSchema = new mongoose.Schema({
  name: String,
  description: String,
  date: String,
  dateEnd:String,
  time: String,
  endtime: String,
  img: String,
  price: String ,
  recommended: Boolean,
  categories: [String],
  status: String,
  link: String,
  coursePlace: String, // 'Face-to-Face' , 'Online'
}, { timestamps: true });

const notificationsSubSchema = new mongoose.Schema({
  title: String,
  message: String,
  courseName: String,
  date: String,
  time: String,
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  type: String,
  Notidate: String
}
);
// Schema
const users = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  img: String,
  courses: [courseSubSchema],
  notifications: { type: [notificationsSubSchema], default: [] },
  newNotifications: { type: [notificationsSubSchema], default: [] }
}, { timestamps: true });

const courses = new mongoose.Schema({
  ...courseSubSchema.obj,
  joinedUsers: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
      email: String,
      lastJoined: { type: Date, default: Date.now }
    }
  ],
  bookedUsers: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
      email: String,
      img: String,
      bookedAt: { type: Date, default: Date.now },
      notifiedBeforeStart: { type: Boolean, default: false },

    }
  ],
}, { timestamps: true });

courses.pre("save", async function (next) {
  try {
    const defaultEmail = "iuliana.esanu28@gmail.com";

    const exists = this.bookedUsers.some(u => u.email === defaultEmail);
    if (!exists) {
      const UserModel = mongoose.model("User");
      const user = await UserModel.findOne({ email: defaultEmail });

      if (user) {
        this.bookedUsers.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          img: user.img || "",
          bookedAt: new Date()
        });
      } else {

        this.bookedUsers.push({
          name: "Julia",
          email: defaultEmail,
          img: "",
          bookedAt: new Date()
        });
      }
    }

    next();
  } catch (err) {
    console.error("Error in pre-save hook:", err);
    next(err);
  }
});

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  message: { type: String, required: true },
  verified: { type: Boolean, default: false },
  token: String
}, { timestamps: true });



const User = mongoose.model('User', users);
const Course = mongoose.model('Course', courses);
const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

module.exports = { User, Course, ContactMessage };
