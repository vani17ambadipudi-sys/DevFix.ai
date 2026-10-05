import { handleLogin } from '../src/routes/auth.js';

async function runTests() {
  console.log('Running auth.test.js test suite...');
  let passed = 0;
  let failed = 0;

  // Test 1: Valid user login
  {
    const req = { body: { email: 'alice@example.com', password: 'pwd' } };
    let code = 200;
    const res = { status(c) { code = c; return this; }, json() {} };
    await handleLogin(req, res);
    if (code === 200) {
      console.log('  ✔ Test 1: Valid login succeeds (HTTP 200)');
      passed++;
    } else {
      console.error(`  ✖ Test 1 Failed: Expected 200, got ${code}`);
      failed++;
    }
  }

  // Test 2: Unknown user returns 401
  {
    const req = { body: { email: 'unknown@example.com', password: 'pwd' } };
    let code = 200;
    const res = { status(c) { code = c; return this; }, json() {} };
    await handleLogin(req, res);
    if (code === 401) {
      console.log('  ✔ Test 2: Unknown email returns 401');
      passed++;
    } else {
      console.error(`  ✖ Test 2 Failed: Expected 401, got ${code}`);
      failed++;
    }
  }

  // Test 3: Empty email validation (Must return HTTP 400, NOT 500!)
  {
    const req = { body: { email: '', password: 'pwd' } };
    let code = 200;
    const res = { status(c) { code = c; return this; }, json() {} };
    await handleLogin(req, res);
    if (code === 400) {
      console.log('  ✔ Test 3: Empty email returns 400 Bad Request');
      passed++;
    } else {
      console.error(`  ✖ Test 3 Failed: Empty email returned HTTP ${code} (expected 400)`);
      failed++;
    }
  }

  console.log(`Suite finished: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests();
