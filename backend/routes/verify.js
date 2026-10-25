const express = require('express');
const router = express.Router();
const Voter = require('../models/Voter');
const jwt = require('jsonwebtoken');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const FACE_MATCH_THRESHOLD = 0.6;

const { calculateDistance } = require('../utils/faceUtils');

// GET /verify/session - Protected endpoint: derives voter identity from verified JWT
router.get('/session', requireAuth, async (req, res) => {
  try {
    const voter = await Voter.findById(req.user.id).select('-faceEmbedding');
    if (!voter) {
      return res.status(404).json({ error: 'Voter not found or account removed.' });
    }

    res.json({
      authenticated: true,
      voter: {
        id: voter._id,
        name: voter.name,
        voterID: voter.voterID,
        walletAddress: voter.walletAddress,
        role: voter.role
      }
    });
  } catch (error) {
    console.error('Session retrieval error:', error);
    res.status(500).json({ error: 'Server error retrieving voter session.' });
  }
});

// GET /verify/admin-check - Protected admin endpoint: requires valid JWT with ADMIN role
router.get('/admin-check', requireAuth, requireAdmin, async (req, res) => {
  res.json({
    admin: true,
    user: {
      id: req.user.id,
      voterID: req.user.voterID,
      walletAddress: req.user.walletAddress,
      role: req.user.role
    }
  });
});

// POST /verify - Public endpoint: compare live face against stored embedding and issue JWT
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
      const THRESHOLD = FACE_MATCH_THRESHOLD;

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

    // Authenticated role and identity are strictly derived from the verified voter record.
    // Wallet address string matching does not confer admin privileges without verified provisioning.

    // Sign JWT Token
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
      console.error('CRITICAL: JWT_SECRET environment variable is missing.');
      return res.status(500).json({ error: 'Internal server configuration error.' });
    }

    const token = jwt.sign(
      { 
        id: voter._id,
        voterID: voter.voterID, 
        walletAddress: voter.walletAddress,
        role: voter.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      match: true,
      token,
      voter: {
        name: voter.name,
        voterID: voter.voterID,
        walletAddress: voter.walletAddress,
        role: voter.role
      }
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Server error during verification' });
  }
});

module.exports = router;
