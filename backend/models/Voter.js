const mongoose = require('mongoose');

const voterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  voterID: {
    type: String,
    required: true,
    unique: true
  },
  walletAddress: {
    type: String,
    required: true,
    unique: true
  },
  faceEmbedding: {
    type: [Number], // Array of 128 numbers from face-api.js
    required: true
  },
  registeredAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Voter', voterSchema);
