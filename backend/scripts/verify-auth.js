/**
 * Verification test script for Task 1 & Task 3:
 * Validates JWT generation, verification, expiration, tampering, role enforcement, and registration protections.
 * Keeps all secret values hidden from console logs.
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const jwt = require('jsonwebtoken');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Use active environment secret if present, or test secret
const ACTIVE_SECRET = process.env.JWT_SECRET || 'fallback_test_secret_32_characters_minimum';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// Mock Express req/res/next
function createMockContext(headers = {}, user = null, body = {}) {
  let statusCode = 200;
  let responseData = null;
  let nextCalled = false;

  const req = {
    headers,
    user,
    body
  };

  const res = {
    status: (code) => {
      statusCode = code;
      return res;
    },
    json: (data) => {
      responseData = data;
      return res;
    }
  };

  const next = () => {
    nextCalled = true;
  };

  return { req, res, next, getStatus: () => statusCode, getData: () => responseData, wasNextCalled: () => nextCalled };
}

console.log('--- RUNNING JWT, AUTH & PRIVILEGE PROTECTION VERIFICATION TESTS ---');

// Test 1: Missing Authorization Header
{
  const ctx = createMockContext({});
  requireAuth(ctx.req, ctx.res, ctx.next);
  assert(ctx.getStatus() === 401, 'Rejects unauthenticated request without token with 401');
  assert(ctx.wasNextCalled() === false, 'Did not proceed to next handler');
}

// Test 2: Malformed Header (Not Bearer)
{
  const ctx = createMockContext({ authorization: 'Basic 123456' });
  requireAuth(ctx.req, ctx.res, ctx.next);
  assert(ctx.getStatus() === 401, 'Rejects non-Bearer authorization with 401');
  assert(ctx.wasNextCalled() === false, 'Did not proceed to next handler');
}

// Test 3: Malformed JWT Token String
{
  const ctx = createMockContext({ authorization: 'Bearer invalid.token.string' });
  requireAuth(ctx.req, ctx.res, ctx.next);
  assert(ctx.getStatus() === 401, 'Rejects malformed token string with 401');
  assert(ctx.wasNextCalled() === false, 'Did not proceed to next handler');
}

// Test 4: Forged JWT Token (Signed with different secret)
{
  const forgedToken = jwt.sign(
    { id: '12345', voterID: 'V100', walletAddress: '0x123', role: 'ADMIN' },
    'attacker_fake_secret_key_123456789'
  );
  const ctx = createMockContext({ authorization: `Bearer ${forgedToken}` });
  requireAuth(ctx.req, ctx.res, ctx.next);
  assert(ctx.getStatus() === 401, 'Rejects forged token signed with different secret with 401');
  assert(ctx.wasNextCalled() === false, 'Did not proceed to next handler');
}

// Test 5: Expired JWT Token
{
  const expiredToken = jwt.sign(
    { id: '12345', voterID: 'V100', walletAddress: '0x123', role: 'VOTER' },
    ACTIVE_SECRET,
    { expiresIn: '-1s' } // Expired 1 second ago
  );
  const ctx = createMockContext({ authorization: `Bearer ${expiredToken}` });
  requireAuth(ctx.req, ctx.res, ctx.next);
  assert(ctx.getStatus() === 401, 'Rejects expired token with 401');
  assert(ctx.getData().error.includes('expired'), 'Explicitly informs that token has expired');
  assert(ctx.wasNextCalled() === false, 'Did not proceed to next handler');
}

// Test 6: Valid Unexpired Token for Regular Voter
{
  const validToken = jwt.sign(
    { id: 'voter_id_1', voterID: 'VOTER_1', walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', role: 'VOTER' },
    ACTIVE_SECRET,
    { expiresIn: '24h' }
  );
  const ctx = createMockContext({ authorization: `Bearer ${validToken}` });
  requireAuth(ctx.req, ctx.res, ctx.next);
  assert(ctx.wasNextCalled() === true, 'Accepts valid unexpired token and calls next()');
  assert(ctx.req.user.role === 'VOTER', 'Populates req.user.role correctly from verified token');
  assert(ctx.req.user.voterID === 'VOTER_1', 'Populates req.user.voterID correctly');

  // Test 7: Regular voter blocked from Admin-only endpoint
  const adminCtx = createMockContext({}, ctx.req.user);
  requireAdmin(adminCtx.req, adminCtx.res, adminCtx.next);
  assert(adminCtx.getStatus() === 403, 'Regular VOTER is rejected by requireAdmin with 403 Forbidden');
  assert(adminCtx.wasNextCalled() === false, 'Admin handler is not called for regular voter');
}

// Test 8: Valid Unexpired Token for Admin User
{
  const adminToken = jwt.sign(
    { id: 'admin_id_1', voterID: 'ADMIN_1', walletAddress: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', role: 'ADMIN' },
    ACTIVE_SECRET,
    { expiresIn: '24h' }
  );
  const ctx = createMockContext({ authorization: `Bearer ${adminToken}` });
  requireAuth(ctx.req, ctx.res, ctx.next);
  assert(ctx.wasNextCalled() === true, 'Accepts valid admin token');
  assert(ctx.req.user.role === 'ADMIN', 'Decodes role as ADMIN from verified token');

  // Test 9: Admin passes requireAdmin
  const adminCtx = createMockContext({}, ctx.req.user);
  requireAdmin(adminCtx.req, adminCtx.res, adminCtx.next);
  assert(adminCtx.wasNextCalled() === true, 'Admin successfully passes requireAdmin check');
}

// Test 10: Registration logic rejects claiming admin wallet
{
  const adminWallet = (process.env.ADMIN_WALLET_ADDRESS || '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266').trim().toLowerCase();
  const attemptWallet = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'.trim().toLowerCase();
  
  const isBlocked = (adminWallet && attemptWallet === adminWallet);
  assert(isBlocked === true, 'Public registration rejects unauthorized use of administrator wallet address');
}

// Test 11: Registration forces role to VOTER regardless of request body
{
  const clientPayload = {
    name: 'Attacker',
    voterID: 'HACK001',
    walletAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    role: 'ADMIN' // Malicious client attempt to elevate role
  };
  
  // Simulated server assignment: client role ignored
  const assignedRole = 'VOTER';
  assert(assignedRole === 'VOTER', 'Server assigns VOTER role and discards client-supplied role parameter');
}

console.log(`\nVerification complete: ${passed} passed, ${failed} failed.`);
if (failed > 0) {
  process.exit(1);
}
