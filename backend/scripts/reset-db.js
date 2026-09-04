require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Voter = require('../models/Voter');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voting-system';

// SAFETY CHECKS
if (process.env.NODE_ENV === 'production') {
  console.error('❌ SAFETY ABORT: Cannot run reset-db in production environment.');
  process.exit(1);
}

if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
  console.warn('⚠️ WARNING: MONGODB_URI does not look like a local database.');
  console.error('❌ SAFETY ABORT: Refusing to reset a potential production database.');
  process.exit(1);
}

async function resetDB() {
  try {
    console.log('Connecting to local MongoDB for test data reset...');
    await mongoose.connect(uri);
    
    console.log('Connected. Emptying Voter collection...');
    const result = await Voter.deleteMany({});
    
    console.log(`✅ Success: Removed ${result.deletedCount} test voters from database.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDB();
