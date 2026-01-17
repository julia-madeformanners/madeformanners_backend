

const { ContactMessage } = require("../data");
const crypto = require("crypto");
const { ClientSecretCredential } = require("@azure/identity");
const { Client } = require("@microsoft/microsoft-graph-client");

const axios = require("axios");
require("isomorphic-fetch");

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
exports.postContactUsDetails = async (req, res) => {
  try {
    const { name, email, phone, message, recaptchaToken } = req.body;
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }
    if (!recaptchaToken) {
      return res.status(400).json({ success: false, message: "reCAPTCHA token missing" });
    }

    // Verify reCAPTCHA
    const recaptchaResponse = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: recaptchaToken,
        },
      }
    );

    if (!recaptchaResponse.data.success) {
      return res.status(403).json({ success: false, message: "Robot verification failed" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const newMessage = new ContactMessage({
      name,
      email,
      phone,
      message,
      verified: false,
      token,
    });
    await newMessage.save();

    const link = `${process.env.FRONTEND_URL}/contactUs/verifyContactEmail?token=${token}`;

    // إرسال رابط التحقق فقط
    const client = getGraphClient();
    const mail = {
      message: {
        subject: "Verify your email",
        body: {
          contentType: "HTML",
          content: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
              <p>Hi ${name},</p>
              <p>Please click the link below to verify your email and send your message:</p>
              <a href="${link}" 
                 style="background:#C6A662;color:white;padding:10px 18px;text-decoration:none;border-radius:6px">
                 Verify Email
              </a>
              <br/><br/>
              <small>Thank you!</small>
            </div>
          `,
        },
        toRecipients: [{ emailAddress: { address: email } }],
      },
      saveToSentItems: "true",
    };

    await client.api(`/users/${SENDER_EMAIL}/sendMail`).post(mail);

    res.status(201).json({ success: true, message: "Please check your email to verify your message" });
  } catch (err) {
    console.error("Error in postContactUsDetails:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// عند الضغط على الرابط بالإيميل: تفعيل الرسالة وإرسالها فعليًا
exports.verifyContactEmail = async (req, res) => {
  console.log('hi')
  try {
    const { token } = req.query;
    const message = await ContactMessage.findOne({ token });

    if (!message) return res.status(400).send("Invalid or expired token");

    message.verified = true;
    message.token = null;
    await message.save();

    // إرسال الرسالة الآن بعد التحقق
    const client = getGraphClient();
    const mail = {
      message: {
        subject: "New Contact Us Message",
        body: {
          contentType: "HTML",
          content: `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#333">
              <p>Name: ${message.name}</p>
              <p>Email: ${message.email}</p>
              <p>Phone: ${message.phone}</p>
              <p>Message: ${message.message}</p>
            </div>
          `,
        },
        toRecipients: [{ emailAddress: { address: SENDER_EMAIL } }],
      },
      saveToSentItems: "true",
    };

    await client.api(`/users/${SENDER_EMAIL}/sendMail`).post(mail);

    // إرسال إشعار بعد التحقق
    await axios.post(`${process.env.SERVER_URL}/api/notification/contactusAlert`, {
        name: message.name,
        email: message.email,
        phone: message.phone,
        message: message.message,
    });

    // إعادة التوجيه للـ frontend مع رسالة نجاح
    res.redirect(`${process.env.FRONTEND_URL}/contact?success=true`);
  } catch (err) {
    console.error("Error in verifyContactEmail:", err);
    res.status(500).send("Server error");
  }
};



exports.getContactUsDetails = async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};
// Delete selected contact messages
exports.deleteContactMessages = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ message: "No messages selected" });

    await ContactMessage.deleteMany({ _id: { $in: ids } });

    res.json({ success: true, message: "Messages deleted successfully" });
  } catch (err) {
    console.error("Error deleting messages:", err);
    res.status(500).json({ success: false, message: "Server error while deleting messages" });
  }
};
