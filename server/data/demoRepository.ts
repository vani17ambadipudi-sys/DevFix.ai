import fs from 'fs';
import path from 'path';
import { RepositoryImporter } from '../repository/repositoryImporter';
import { db, RepositoryRecord } from '../database/db';

export class DemoRepositorySeed {
  public static async ensureDemoRepository(forceFresh: boolean = false): Promise<RepositoryRecord> {
    const existing = db.getRepositories().find((r) => r.name === 'auth-api-demo');
    if (existing && !forceFresh && fs.existsSync(existing.workspacePath)) {
      return existing;
    }

    if (existing) {
      db.deleteRepository(existing.id);
    }

    const demoDir = path.resolve(process.cwd(), 'data', 'demo-repos', 'auth-api-demo');
    fs.mkdirSync(path.join(demoDir, 'src', 'routes'), { recursive: true });
    fs.mkdirSync(path.join(demoDir, 'src', 'services'), { recursive: true });
    fs.mkdirSync(path.join(demoDir, 'tests'), { recursive: true });

    // 1. package.json with ES module support
    fs.writeFileSync(
      path.join(demoDir, 'package.json'),
      JSON.stringify(
        {
          name: 'auth-api-demo',
          version: '1.0.0',
          type: 'module',
          description: 'Production authentication microservice with user validation',
          main: 'src/server.ts',
          scripts: {
            test: 'node tests/auth.test.js',
            reproduce: 'node tests/reproduce.js',
          },
          dependencies: {
            express: '^4.21.0',
          },
        },
        null,
        2
      )
    );

    // 2. src/services/authService.js
    fs.writeFileSync(
      path.join(demoDir, 'src', 'services', 'authService.js'),
      `// Simulated User Database Service
const users = [
  { id: 'u1', email: 'alice@example.com', name: 'Alice Smith', passwordHash: 'hash123' },
  { id: 'u2', email: 'bob@example.com', name: 'Bob Jones', passwordHash: 'hash456' }
];

export async function findUserByEmail(email) {
  // Database constraint: lookup email must be non-empty string
  if (!email || typeof email !== 'string' || !email.trim()) {
    throw new Error('Database lookup requires non-empty email string.');
  }
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase().trim()) || null;
}
`
    );

    // 3. src/routes/auth.js (The Buggy Route: lacks input validation before calling database!)
    fs.writeFileSync(
      path.join(demoDir, 'src', 'routes', 'auth.js'),
      `import { findUserByEmail } from '../services/authService.js';

export async function handleLogin(req, res) {
  try {
    const { email, password } = req.body || {};

    // BUG: Missing empty/null validation! Calling findUserByEmail with empty email throws an unhandled exception!
    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials.' });
    }

    return res.status(200).json({ success: true, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    // Unhandled exception bubbled up as HTTP 500 Internal Server Error
    return res.status(500).json({ success: false, error: err.message });
  }
}
`
    );

    // 4. tests/reproduce.js (Deterministic Reproduction Script)
    fs.writeFileSync(
      path.join(demoDir, 'tests', 'reproduce.js'),
      `import { handleLogin } from '../src/routes/auth.js';

async function testEmptyEmail() {
  const req = { body: { email: '', password: 'SomePassword123!' } };
  let statusCode = 200;
  let responseData = null;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    }
  };

  await handleLogin(req, res);

  console.log(\`Result: HTTP \${statusCode}\`);
  console.log(\`Response: \${JSON.stringify(responseData)}\`);

  if (statusCode === 500) {
    console.error('REPRODUCTION CONFIRMED: Login API returned HTTP 500 on empty email!');
    process.exit(1); // Exit 1 confirms the bug is reproduced
  } else if (statusCode === 400) {
    console.log('PASS: Login API correctly rejected empty email with HTTP 400.');
    process.exit(0);
  } else {
    console.warn(\`Unexpected status code: \${statusCode}\`);
    process.exit(2);
  }
}

testEmptyEmail();
`
    );

    // 5. tests/auth.test.js (Test Suite)
    fs.writeFileSync(
      path.join(demoDir, 'tests', 'auth.test.js'),
      `import { handleLogin } from '../src/routes/auth.js';

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
      console.error(\`  ✖ Test 1 Failed: Expected 200, got \${code}\`);
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
      console.error(\`  ✖ Test 2 Failed: Expected 401, got \${code}\`);
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
      console.error(\`  ✖ Test 3 Failed: Empty email returned HTTP \${code} (expected 400)\`);
      failed++;
    }
  }

  console.log(\`Suite finished: \${passed} passed, \${failed} failed.\`);
  if (failed > 0) process.exit(1);
}

runTests();
`
    );

    // 6. README.md
    fs.writeFileSync(
      path.join(demoDir, 'README.md'),
      `# Auth API Demo Repository

Canonical Section 38 demonstration repository for DevFix AI Phase 8.

## Known Issue:
Login API returns HTTP 500 when email is empty instead of returning HTTP 400 Bad Request with validation error.
`
    );

    // Import into fresh DevFix workspace
    return await RepositoryImporter.importFromLocalFolder(
      demoDir,
      'auth-api-demo',
      'user_demo_01'
    );
  }
}
