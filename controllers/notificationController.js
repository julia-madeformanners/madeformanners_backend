const crypto = require("crypto");
const { User, Course } = require("../data");
const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const SENDER_EMAIL = process.env.SENDER_EMAIL;

function getGraphClient() {
  const credential = new ClientSecretCredential(TENANT_ID, CLIENT_ID, CLIENT_SECRET);
  return Client.init({
    authProvider: async (done) => {
      try {
        const tokenResponse = await credential.getToken("https://graph.microsoft.com/.default");
        done(null, tokenResponse.token);
      } catch (err) {
        done(err, null);
      }
    },
  });
}

// ======= Notification for New Course =======
exports.notificationAlert = async (req, res) => {
  try {
    const { course } = req.body;
    if (!course) return res.status(400).json({ message: "Course data is required" });

    const users = await User.find({}, "_id name email");
    if (!users.length) return res.status(200).json({ message: "No users to notify" });
    const client = getGraphClient();
    const Notidate = new Date().toLocaleDateString('en-GB');
    
    const info =
    {
      title: "📢 New Course Added",
      message: `A new course (${course.name}) has been added.`,
      courseName: course.name,
      date: course.date,
      time: course.time,
      type: "course",
      Notidate: Notidate
    }
    // Bulk operations to push notification to all users
    const bulkOps = users.map(user => ({
      updateOne: {
        filter: { _id: user._id },
        update: {
          $push: {
            notifications: info,
            newNotifications:info
          }
        }
      }
    }));
    await User.bulkWrite(bulkOps);

    // Emit notifications via Socket.io
    global.io.emit("new_course", info);

    // Send email to all users
    for (const user of users) {
      const mail = {
        message: {
          subject: `📢 New Course Added: ${course.name}`,
          body: {
            contentType: "HTML",
            content: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
              <h2>New Course Available 🎉</h2>
              <p>Hi ${user.name}, we're excited to announce a new course on <b>${course.name}</b>!</p>
              <p>${course.description || ""}</p>
              <p><b>Date:</b> ${course.date} (${course.time} - ${course.endtime})</p>
              <p><b>Price:</b> ${course.price} £</p>
              <a href="https://madeformanners.com/courses" 
                 style="background:#C6A662;color:white;padding:10px 18px;text-decoration:none;border-radius:6px">
                 View Course
              </a>
              <br/><br/>
              <small>This is an automated message — please do not reply.</small>
            </div>
            `,
          },
          toRecipients: [{ emailAddress: { address: user.email } }],
        },
        saveToSentItems: "true",
      };
      await client.api(`/users/${SENDER_EMAIL}/sendMail`).post(mail);
    }

    res.json({ message: "Notification sent successfully", notifiedUsers: users.length });
  } catch (err) {
    console.error(" Error sending notification:", err);
    res.status(500).json({ message: "Server error while sending notification", error: err.message });
  }
};

// ======= Notification Before Course for Booked Users =======
exports.notificationBeforeCourse = async () => {
  try {
    const now = new Date();
    const client = getGraphClient();
    const courses = await Course.find();

    for (const course of courses) {

      if (!course.date || !course.time || !course.bookedUsers?.length) continue;

      const courseDateTime = new Date(`${course.date} ${course.time}`);
      const diff = (courseDateTime - now) / (1000 * 60);

      if (diff > 0 && diff <= 65) {
        const bulkOps = [];

        const Notidate = new Date().toLocaleDateString('en-GB');

        for (const booked of course.bookedUsers) {
          const info =
          {
            userId: booked.userId || booked._id || booked.id,
            title: "⏰ Course Reminder",
            message: `Your course (${course.name}) starts soon.`,
            courseName: course.name,
            date: course.date,
            time: course.time,
            type: "course",
            Notidate: Notidate,
          }
          if (!booked.notifiedBeforeStart) {
            bulkOps.push({
              updateOne: {
                filter: { _id: booked.userId || booked._id || booked.id },
                update: {
                  $push: {
                    notifications: info,
                    newNotifications:info
                  }
                }
              }
            });

            // Emit real-time via Socket.io
            global.io.emit("course_reminder", info);

            // Send email
            const mail = {
              message: {
                subject: `⏰ Reminder: Your course "${course.name}" starts soon!`,
                body: {
                  contentType: "HTML",
                  content: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
                  <h2>Course Reminder</h2>
                  <p>Hi ${booked.name},</p>
                  <p>This is a friendly reminder that your course <b>${course.name}</b> will start in about one hour.</p>
                  <p><b>Date:</b> ${course.date}</p>
                  <p><b>Time:</b> ${course.time} - ${course.endtime}</p>
                  <a href="https://madeformanners.com/courses" 
                     style="background:#C6A662;color:white;padding:10px 18px;text-decoration:none;border-radius:6px">
                     Join Course
                  </a>
                  <br/><br/>
                  <small>This is an automated reminder — please do not reply.</small>
                </div>
                `,
                },
                toRecipients: [{ emailAddress: { address: booked.email } }],
              },
              saveToSentItems: "true",
            };
            await client.api(`/users/${SENDER_EMAIL}/sendMail`).post(mail);
          }

          // Apply bulk notifications in one go
          if (bulkOps.length > 0) await User.bulkWrite(bulkOps);

          booked.notifiedBeforeStart = true;
          await course.save();
        }
      }
    }

    console.log("Course reminder check completed.");
  } catch (err) {
    console.error("Error sending course reminders:", err);
  }
};

exports.contactMessageAlert = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    if (!name || !email || !message || !phone)
      return res.status(400).json({ message: "All required fields must be filled" });

    // ===========================
    // Create the notification object
    // ===========================
    const now = new Date();

    const formattedDate = now.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
    const Notidate = new Date().toLocaleDateString('en-GB');
    const notification = {
      title: "📩 New Contact Message",
      message: `New contact message from ${name}`,
      date: formattedDate,
      data: { name, email, phone, message },
      read: false,
      type: "contact",
      Notidate: Notidate
    };

    // ===========================
    // Add notification to the admin user
    // ===========================

    const adminUser = await User.findOne({ email: "iuliana.esanu28@gmail.com" });

    if (adminUser) {
      adminUser.notifications.push(notification);
      adminUser.newNotifications.push(notification);
      await adminUser.save();

    }
    global.io.emit("contact_message", notification);
    // ===========================
    // Send email (your existing code)
    // ===========================

    const client = getGraphClient();

    const mail = {
      message: {
        subject: `📩 New Contact Message from ${name}`,
        body: {
          contentType: "HTML",
          content: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
            <h2>📬 New Contact Form Submission</h2>
            <p><b>Name:</b> ${name}</p>
            <p><b>Email:</b> ${email}</p>
            <p><b>Phone:</b> ${phone || "—"}</p>
            <p><b>Message:</b></p>
            <div style="border-left:3px solid #C6A662;padding-left:10px;margin-top:5px">
              ${message}
            </div>

            <a href="https://madeformanners.com/contact" 
              style="background:#C6A662;color:white;padding:10px 18px;text-decoration:none;border-radius:6px">
              View Course
            </a>

            <br/><br/>
            <small>This message was automatically forwarded from the website contact form.</small>
          </div>
          `
        },
        toRecipients: [
          { emailAddress: { address: "hello@madeformanners.com" } }
        ],
      },
      saveToSentItems: "true",
    };

    await client.api("/users/hello@madeformanners.com/sendMail").post(mail);

    return res.status(200).json({ message: "Message sent & notification added" });

  } catch (error) {
    console.error("Error sending contact message alert:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.markNotificationsAsRead = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.newNotifications = [];

    await user.save();

    return res.status(200).json({ message: "Notifications marked as read" });
  } catch (err) {
    console.error("Error marking notifications as read:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
};
