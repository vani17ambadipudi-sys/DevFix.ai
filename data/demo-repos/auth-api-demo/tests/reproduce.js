import { handleLogin } from '../src/routes/auth.js';

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

  console.log(`Result: HTTP ${statusCode}`);
  console.log(`Response: ${JSON.stringify(responseData)}`);

  if (statusCode === 500) {
    console.error('REPRODUCTION CONFIRMED: Login API returned HTTP 500 on empty email!');
    process.exit(1); // Exit 1 confirms the bug is reproduced
  } else if (statusCode === 400) {
    console.log('PASS: Login API correctly rejected empty email with HTTP 400.');
    process.exit(0);
  } else {
    console.warn(`Unexpected status code: ${statusCode}`);
    process.exit(2);
  }
}

testEmptyEmail();
