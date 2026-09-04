const { spawnSync } = require('child_process');
const path = require('path');

console.log('\n=====================================================');
console.log('🔄 STARTING DEVELOPMENT TEST ENVIRONMENT RESET');
console.log('=====================================================\n');

// 1. Reset Database
console.log('[1/2] Resetting MongoDB test data...');
const backendScriptPath = path.join(__dirname, '..', 'backend', 'scripts', 'reset-db.js');
const dbReset = spawnSync('node', [backendScriptPath], { stdio: 'inherit' });

if (dbReset.status !== 0) {
  console.error('\n❌ Database reset failed. Aborting full reset.');
  process.exit(1);
}

// 2. Blockchain Reset Instructions
console.log('\n[2/2] Resetting Blockchain State...');
console.log(`
✅ Database Reset Successful (Voter records cleared).

⚠️  IMPORTANT: Database reset alone does NOT clear the blockchain!
To completely reset the test environment (including recorded votes),
you must reset the local Hardhat network:

1. Stop your currently running development server (Press Ctrl+C in its terminal).
2. Start it again with: npm run dev:windows (or npm run dev)

This will:
- Launch a fresh, empty local blockchain.
- Automatically re-deploy the Voting smart contract.
- Automatically sync the new contract address to the frontend.

=====================================================
`);
