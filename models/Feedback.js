const mongoose = require("mongoose");


const FeedbackSchema = new mongoose.Schema({
  stars: {
    type: Number,
    required: true,
    min: 1, // Minimum 1 star
    max: 5, // Maximum 5 stars
  },
  title: {
    type: String,
    trim: true,
  },
  comment: {
    type: String,
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  }
}, { 
  timestamps: true // Adds createdAt and updatedAt fields
});

module.exports = mongoose.model("Feedback", FeedbackSchema);
