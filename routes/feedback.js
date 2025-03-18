const express = require('express');
const Feedback = require('../models/Feedback');
const User = require('../models/User');
const router = express.Router();
const axios = require('axios');
const authMiddleware = require("../authMiddleware");


router.post('/submitFeedback', authMiddleware, async (req, res) => {
  const {stars, title, comment, userId} = req.body;
  console.log("this is stars: ", stars);
  console.log("this is title: ", title);
  console.log("this is comment: ", comment);
  console.log("this is userId: ", userId);
  // Validate required fields
  if (!stars || stars === 0 || !userId) {
    return res.status(400).json({ message: 'All required fields must be filled out.'});
  }

  try {
    const userResponse = await User.findById(userId);

    if (!userResponse) {
    return res.status(404).json({ message: 'User not found. Failed to submit feedback.' });
    }

    console.log("before adding new feedback");
    const newFeedback = new Feedback(req.body);
    await newFeedback.save();
    console.log("after adding new feedback");

    res.status(200).json({message: 'Feedback Submitted Successfully', newFeedback});
  } catch (error) {
    res.status(400).json({ message: 'Failed to submit feedback ', error});
  }
});

module.exports = router;
