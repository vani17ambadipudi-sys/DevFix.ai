import assert from 'assert';
import { SecureSandbox } from '../../server/security/sandbox';

export async function runSandboxTests() {
  console.log('  ▶ Running SecureSandbox tests...');

  // Test 1: Successful Python execution
  const res1 = await SecureSandbox.execute('Python', 'print(10 + 20)');
  assert.strictEqual(res1.attempted, true, 'Execution must be attempted');
  assert.strictEqual(res1.success, true, 'Clean arithmetic must succeed');
  assert.strictEqual(res1.stdout, '30', 'Stdout must contain output 30');
  assert.strictEqual(res1.exitCode, 0, 'Exit code must be 0');

  // Test 2: Runtime error capture
  const res2 = await SecureSandbox.execute('Python', 'print(1 / 0)');
  assert.strictEqual(res2.attempted, true, 'Execution must be attempted');
  assert.strictEqual(res2.success, false, 'ZeroDivisionError must exit with error');
  assert.strictEqual(res2.stderr.includes('ZeroDivisionError'), true, 'Stderr must contain ZeroDivisionError');

  // Test 3: Language rejection
  const res3 = await SecureSandbox.execute('Bash', 'rm -rf /');
  assert.strictEqual(res3.attempted, false, 'Unsupported language execution must not be attempted');
  assert.strictEqual(res3.success, false);

  console.log('  ✔ SecureSandbox tests passed.');
}
