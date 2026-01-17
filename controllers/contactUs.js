

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
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!recaptchaToken) {
      return res.status(400).json({ message: "reCAPTCHA token missing" });
    }

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
      return res.status(403).json({ message: "Robot verification failed" });
    }

    const token = crypto.randomBytes(32).toString("hex");

    // نحفظ الرسالة غير مؤكدة
    const newMessage = new ContactMessage({
      name,
      email,
      phone,
      message,
      verified: false,
      token,
    });
    
    await newMessage.save();
    

    const link = `${process.env.FRONTEND_URL}/ConfirmEmail?token=${token}`;

    const client = getGraphClient();
    await client.api(`/users/${SENDER_EMAIL}/sendMail`).post({
      message: {
        subject: "Verify your email",
        body: {
          contentType: "HTML",
          content: `
            <p>Hi ${name},</p>
            <p>Please verify your email to send your message:</p>
            <a href="${link}" style="background:#25354c;color:white;padding:5px 18px;border-radius:6px;text-decoration:none">
              Verify Email
            </a>
          `,
        },
        toRecipients: [{ emailAddress: { address: email } }],
      },
    });

    res.status(201).json({
      success: true,
      message: "Please check your email to verify your message",
    });
  } catch (err) {
    console.error("postContactUsDetails error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// عند الضغط على الرابط بالإيميل: تفعيل الرسالة وإرسالها فعليًا
exports.verifyContactEmail = async (req, res) => {
  try {
    const { token } = req.query;
   

    if (!token) {
      return res.status(400).json({ message: "Token missing" });
    }

    const message = await ContactMessage.findOne({ token });
    
    if (!message) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    if (message.verified) {
      return res.json({ success: true, message: "Already verified" });
    }

    message.verified = true;
    message.token = null;
    await message.save();

    // إرسال الرسالة للأدمن بعد التحقق فقط
    const client = getGraphClient();
    await client.api(`/users/${SENDER_EMAIL}/sendMail`).post({
      message: {
        subject: "📢 New Contact Us Message",
        body: {
          contentType: "HTML",
          content: `
            <p><strong>Name:</strong> ${message.name}</p>
            <p><strong>Email:</strong> ${message.email}</p>
            <p><strong>Phone:</strong> ${message.phone}</p>
            <p><strong>Message:</strong> ${message.message}</p>
          `,
        },
        toRecipients: [{ emailAddress: { address: SENDER_EMAIL } }],
      },
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("verifyContactEmail error:", err);
    res.status(500).json({ message: "Server error" });
  }
};




exports.getContactUsDetails = async (req, res) => {
  try {
    const messages = await ContactMessage
      .find({ verified: true })
      .sort({ createdAt: -1 });

    res.json(messages);
  } catch (err) {
    console.error("getContactUsDetails error:", err);
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
