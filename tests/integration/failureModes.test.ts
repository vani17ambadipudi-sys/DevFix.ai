import assert from 'assert';
import { SecureSandbox } from '../../server/security/sandbox';
import { mcpServer } from '../../mcp-server/server';

export async function runFailureModesTests() {
  console.log('  ▶ Running Failure Modes integration tests (Section 25)...');

  // Test 1: Infinite loop timeout
  const timeoutCode = `import time\nwhile True:\n    time.sleep(0.1)`;
  const res1 = await SecureSandbox.execute('Python', timeoutCode, 'fail_test_timeout');
  assert.strictEqual(res1.attempted, true, 'Execution attempted');
  assert.strictEqual(res1.success, false, 'Infinite loop must not succeed');
  assert.strictEqual(res1.timedOut, true, 'Execution must record timedOut: true');

  // Test 2: Invalid language rejection
  const res2 = await SecureSandbox.execute('Cobol', 'DISPLAY "HI"');
  assert.strictEqual(res2.attempted, false, 'Invalid language must be rejected before process spawn');

  // Test 3: Path traversal rejection in MCP
  const res3 = await mcpServer.executeTool({
    tool: 'read_project_file',
    arguments: { path: '../../../root/secret.txt' },
  });
  assert.strictEqual(res3.success, false, 'Forbidden path must return success: false');

  console.log('  ✔ Failure Modes integration tests passed.');
}
