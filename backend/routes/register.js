const express = require('express');
const router = express.Router();
const Voter = require('../models/Voter');
const { calculateDistance } = require('../utils/faceUtils');

const DUPLICATE_FACE_THRESHOLD = 0.45; // Stricter than verify threshold (0.6) to prevent false duplicate rejections

// POST /register - Save voter with face embedding
router.post('/', async (req, res) => {
  try {
    const { name, voterID, walletAddress, faceEmbedding } = req.body;

    // Validate required fields
    if (!name || !voterID || !walletAddress || !faceEmbedding) {
      return res.status(400).json({ 
        error: 'Missing required fields: name, voterID, walletAddress, faceEmbedding' 
      });
    }
    
    // Validate face embedding format
    if (!Array.isArray(faceEmbedding) || faceEmbedding.length !== 128) {
      return res.status(400).json({ 
        error: 'Invalid face embedding. Expected array of 128 numbers.' 
      });
    }
    if (!faceEmbedding.every(n => typeof n === 'number' && !isNaN(n))) {
      return res.status(400).json({ error: 'Face embedding must contain valid numbers' });
    }

    // Check if voterID already exists
    const existingVoter = await Voter.findOne({ voterID });
    if (existingVoter) {
      return res.status(400).json({ error: 'Voter ID already registered' });
    }

    // Check if wallet address already registered
    const existingWallet = await Voter.findOne({ walletAddress });
    if (existingWallet) {
      return res.status(400).json({ error: 'Wallet address already registered' });
    }

    // Check for biometric duplicate
    const allVoters = await Voter.find();
    for (const v of allVoters) {
      const distance = calculateDistance(faceEmbedding, v.faceEmbedding);
      if (distance < DUPLICATE_FACE_THRESHOLD) {
        return res.status(400).json({ 
          error: 'A similar biometric identity is already registered.' 
        });
      }
    }

    // Create new voter
    const voter = new Voter({
      name,
      voterID,
      walletAddress,
      faceEmbedding
    });

    await voter.save();

    res.status(201).json({
      success: true,
      message: 'Voter registered successfully',
      voter: {
        name: voter.name,
        voterID: voter.voterID,
        walletAddress: voter.walletAddress
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

module.exports = router;
