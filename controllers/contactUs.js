

const { ContactMessage} = require("../data");
exports.postContactUsDetails = async (req, res) => {
    
  try {
    const { name, email, phone, message } = req.body;
    const newMessage = new ContactMessage({ name, email, phone, message });
    await newMessage.save();
    res.status(201).json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};


exports.getContactUsDetails =  async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};