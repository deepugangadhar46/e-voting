const express = require('express');
const router = express.Router();
const Voter = require('../models/Voter');

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
