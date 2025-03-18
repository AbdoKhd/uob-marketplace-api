const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  about: {
    type: String,
    required: false,
  },
  campus: {
    type: String,
    required: false,
  },
  profilePictureKey: {
    type: String, // Key to the image
    required: false,
  },
  myListings: {
    type: [String], // Listings id of the my listings
    required: false,
  },
  myFavorites: {
    type: [String], // Listings id of my favorites
    required: false,
  }
}, {
  timestamps: true
});

// Hash the password before saving the user
UserSchema.pre('save', async function(next) {
  if (this.isModified('password') || this.isNew) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

// Method to compare password for login
UserSchema.methods.comparePassword = function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', UserSchema);

module.exports = User;
