const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const User = require("../models/User");
const crypto = require("crypto");
const ResetCode = require("../models/ResetCode");
const RegistrationCode = require("../models/RegistrationCode");
require("dotenv").config();
const util = require("util");

// Email Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Send Reset Password Code API
router.post("/send-reset-code", async (req, res) => {
  const { email } = req.body;

  console.log("sending reset code to this email: ", email);

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate a 4-digit reset code
    const resetCode = crypto.randomInt(1000, 9999).toString();

    const mailOptions = {
      from: `"UOB Marketplace" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Code",
      text: `Your password reset code is: ${resetCode}. It expires in 5 minutes`,
      // replyTo: "UOB@marketplace.com",
    };
    
    // Convert sendMail to a Promise-based function
    const sendMailAsync = util.promisify(transporter.sendMail.bind(transporter));

    // Await the email sending process
    await sendMailAsync(mailOptions);
    console.log("Reset code sent successfully");

    // Store the reset code in the database with expiration
    await ResetCode.findOneAndUpdate(
      { email },
      { email, code: resetCode, expiresAt: Date.now() + 5 * 60 * 1000 }, // Expires in 5 minutes
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Reset code sent successfully" });
  } catch (error) {
    console.error("Error sending reset code:", error);
    res.status(500).json({ message: "Error sending reset code" });
  }
});

// Send Registration Code API
router.post("/send-registration-code", async (req, res) => {
  const { email } = req.body;

  console.log("sending registration code to this email: ", email);

  // Validate email format
  const universityEmailRegex = /^[a-zA-Z0-9._%+-]+@(balamand.edu.lb|std.balamand.edu.lb|fty.balamand.edu.lb)$/;
  if (!universityEmailRegex.test(email)) {
    return res.status(400).json({ message: "Invalid email. Only University of Balamand emails are allowed." });
  }

  // Check if the email is already registered
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "Email is already registered." });
  }
  

  try {
    // Generate a 4-digit registration code
    const resetCode = crypto.randomInt(1000, 9999).toString();

    const mailOptions = {
      from: `"UOB Marketplace" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Registration Code",
      text: `This is your registration code is: ${resetCode}. It expires in 5 minutes`,
      // replyTo: process.env.EMAIL_USER,
    };

    // Convert sendMail to a Promise-based function
    const sendMailAsync = util.promisify(transporter.sendMail.bind(transporter));

    // Await the email sending process
    await sendMailAsync(mailOptions);
    console.log("Registration code sent successfully");

    // Store the registration code in the database with expiration
    await RegistrationCode.findOneAndUpdate(
      { email },
      { email, code: resetCode, expiresAt: Date.now() + 5 * 60 * 1000 }, // Expires in 5 minutes
      { upsert: true, new: true }
    );

    res.status(200).json({ message: "Registration code sent successfully" });
  } catch (error) {
    console.error("Error sending registration code:", error);
    res.status(500).json({ message: "Error sending registration code" });
  }
});

// Verify the reset password code
router.post("/verify-reset-code", async (req, res) => {
  const { email, code } = req.body;

  try {
    const resetCodeEntry = await ResetCode.findOne({ email, code });

    if (!resetCodeEntry) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    if (resetCodeEntry.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Reset code has expired" });
    }

    res.status(200).json({ message: "Code verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error verifying reset code" });
  }
});


// Verify the registration code
router.post("/verify-registration-code", async (req, res) => {
  const { email, code } = req.body;

  try {
    const registrationCodeEntry = await RegistrationCode.findOne({ email, code });

    if (!registrationCodeEntry) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    if (registrationCodeEntry.expiresAt < Date.now()) {
      return res.status(400).json({ message: "Reset code has expired" });
    }

    res.status(200).json({ message: "Code verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error verifying reset code" });
  }
});


module.exports = router;
