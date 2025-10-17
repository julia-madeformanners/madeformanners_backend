const mongoose = require('mongoose');

// Sub-schema للكورسات داخل المستخدم
const courseSubSchema = new mongoose.Schema({
    name: String,
    description: String,
    date: String,
    time: String,
    endtime: String,
    img: String,
    price: Number,
    recommended: Boolean,
    categories: [String],
    status: String,
    link: String,
}, { timestamps: true });

// Schema للمستخدم
const users = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    img: String,
    courses: [courseSubSchema],
}, { timestamps: true });

// Schema للكورس
const courses = new mongoose.Schema({
    name: String,
    description: String,
    date: String,
    time: String,
    endtime: String,
    img: String,
    price: Number,
    recommended: Boolean,
    link: String,
    categories: [String],
    // إضافة مصفوفة المشاركين
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
            img:String,
            bookedAt: { type: Date, default: Date.now }
        
        }
    ],
}, { timestamps: true });

const contactMessageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
    message: { type: String, required: true }
}, { timestamps: true });

const User = mongoose.model('User', users);
const Course = mongoose.model('Course', courses);
const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);

module.exports = { User, Course, ContactMessage };
