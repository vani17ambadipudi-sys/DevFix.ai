import assert from 'assert';
import { StaticAnalyzerFallback } from '../../server/services/staticAnalyzer';
import { mcpServer } from '../../mcp-server/server';
import { tracer } from '../../server/observability/tracer';

export async function runE2ePipelineTests() {
  console.log('  ▶ Running E2E Pipeline integration tests (Section 38)...');

  const testCode = `numbers = [10, 20, 30]\n\nfor i in range(len(numbers) + 1):\n    print(numbers[i])`;
  const requestId = `test_e2e_${Date.now()}`;

  tracer.startTrace(requestId, 'integration_test_pipeline');

  // Step 1: Static Analyzer finds off-by-one error
  tracer.stepStart(requestId, 'Analyzer', 'Analyzer Agent');
  const analysis = StaticAnalyzerFallback.analyze('Python', testCode);
  tracer.stepEnd(requestId, 'Analyzer', 'success');

  assert.strictEqual(analysis.problems.length > 0, true, 'Analyzer must find problem');
  assert.strictEqual(analysis.correctedCode.includes('range(len(numbers))'), true, 'Fixer must correct range');

  // Step 2: Tester executes in MCP Sandbox
  tracer.stepStart(requestId, 'Tester', 'Tester Agent');
  const execution = await mcpServer.executeTool({
    tool: 'run_code',
    arguments: {
      language: 'Python',
      code: analysis.correctedCode,
    },
  });
  tracer.stepEnd(requestId, 'Tester', 'success');

  assert.strictEqual(execution.success, true, 'Corrected code must run with exit code 0');
  assert.strictEqual(execution.data?.stdout.includes('10\n20\n30'), true, 'Stdout must print 10, 20, 30');

  // Step 3: Reviewer approval
  tracer.stepStart(requestId, 'Reviewer', 'Reviewer Agent');
  const approved = Boolean(execution.success && execution.data?.success);
  tracer.stepEnd(requestId, 'Reviewer', 'success');

  assert.strictEqual(approved, true, 'Reviewer must approve verified execution');

  tracer.finishTrace(requestId, 'success');
  console.log('  ✔ E2E Pipeline integration tests passed.');
}
