const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ListingSchema = new mongoose.Schema({
  //Fields:

  imagesKey: {
    type: [String], // Array of strings to hold keys
    required: false
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: false
  },
  price: {
    type: Number,
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',  // This refers to the User model
    required: true
  }
}, {
  timestamps: true
});

const Listing = mongoose.model('Listing', ListingSchema);

module.exports = Listing;