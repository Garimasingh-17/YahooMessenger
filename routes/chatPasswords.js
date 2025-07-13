const express = require("express");
const router = express.Router();
const ChatPassword = require("../models/ChatPassword");

router.post("/", async (req, res) => {
  const { chatName, password } = req.body;

  try {
    let existing = await ChatPassword.findOne({ chatName });
    if (existing) {
      existing.password = password;
      await existing.save();
    } else {
      await ChatPassword.create({ chatName, password });
    }
    res.json({ success: true, message: "Password saved" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
