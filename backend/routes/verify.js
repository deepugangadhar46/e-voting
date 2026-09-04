const express = require('express');
const router = express.Router();
const Voter = require('../models/Voter');
const FACE_MATCH_THRESHOLD = 0.6;

const { calculateDistance } = require('../utils/faceUtils');

// POST /verify - Compare live face against stored embedding
router.post('/', async (req, res) => {
  try {
    const { faceEmbedding, voterID } = req.body;

    if (!faceEmbedding) {
      return res.status(400).json({ error: 'Face embedding is required' });
    }

    // Find voter by ID or search all voters
    let voter;
    if (voterID) {
      voter = await Voter.findOne({ voterID });
    } else {
      // Search through all voters to find best match
      const allVoters = await Voter.find();
      let bestMatch = null;
      let bestDistance = Infinity;
      const THRESHOLD = FACE_MATCH_THRESHOLD; // Use constant for face match threshold

      for (const v of allVoters) {
        const distance = calculateDistance(faceEmbedding, v.faceEmbedding);
        if (distance < bestDistance && distance < THRESHOLD) {
          bestDistance = distance;
          bestMatch = v;
        }
      }

      voter = bestMatch;
    }

    if (!voter) {
      return res.status(401).json({ 
        match: false, 
        error: 'Face not recognized or voter not found' 
      });
    }

    // If voterID was provided, verify the face matches
    if (voterID) {
      const distance = calculateDistance(faceEmbedding, voter.faceEmbedding);
      const THRESHOLD = FACE_MATCH_THRESHOLD;
      
      if (distance >= THRESHOLD) {
        return res.status(401).json({ 
          match: false, 
          error: 'Face does not match registered voter' 
        });
      }
    }

    res.json({
      match: true,
      voter: {
        name: voter.name,
        voterID: voter.voterID,
        walletAddress: voter.walletAddress
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

module.exports = router;
