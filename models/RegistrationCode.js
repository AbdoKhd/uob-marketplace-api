const mongoose = require("mongoose");

const registrationCodeSchema = new mongoose.Schema({
  email: { type: String, required: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true }, // Expiration time
});

module.exports = mongoose.model("RegistrationCode", registrationCodeSchema);
