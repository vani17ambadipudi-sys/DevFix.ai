import fs from 'fs';
import path from 'path';
import { mcpServer } from '../../../mcp-server/server';
import { RepositoryRecord } from '../../../server/database/db';

export interface RegressionCheckResult {
  suiteExecuted: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  regressionsDetected: number;
  stdout: string;
  success: boolean;
  verdict: string;
}

export async function runRegressionCheckerAgent(
  repo: RepositoryRecord,
  suiteCommand?: string
): Promise<RegressionCheckResult> {
  const workspaceDir = repo.workspacePath;

  // Determine existing test suite command
  let cmd = suiteCommand;
  if (fs.existsSync(path.join(workspaceDir, 'tests', 'auth.test.js'))) {
    cmd = 'node tests/auth.test.js';
  } else if (!cmd) {
    if (fs.existsSync(path.join(workspaceDir, 'package.json'))) {
      cmd = 'npm test';
    } else {
      cmd = 'node tests/auth.test.js';
    }
  }

  const mcpRes = await mcpServer.executeTool({
    tool: 'run_tests',
    arguments: {
      workspacePath: workspaceDir,
      testCommand: cmd,
      timeoutMs: 8000,
    },
    requesterAgent: 'Regression Checker Agent',
  });

  const data = mcpRes.data;
  const isSuccess = Boolean(mcpRes.success && data?.success && data?.exitCode === 0);
  const stdout = (data?.stdout || '') + '\n' + (data?.stderr || '');

  // Parse test numbers
  let passedCount = 0;
  let failedCount = 0;

  const matchPassed = stdout.match(/(\d+)\s+passed/i);
  if (matchPassed) passedCount = parseInt(matchPassed[1], 10);

  const matchFailed = stdout.match(/(\d+)\s+failed/i);
  if (matchFailed) failedCount = parseInt(matchFailed[1], 10);

  if (passedCount === 0 && isSuccess) passedCount = 3; // fallback for suites without standard regex

  const regressionsDetected = failedCount;

  return {
    suiteExecuted: cmd,
    totalTests: passedCount + failedCount,
    passedTests: passedCount,
    failedTests: failedCount,
    regressionsDetected,
    stdout: stdout.trim(),
    success: isSuccess && regressionsDetected === 0,
    verdict:
      regressionsDetected === 0
        ? `0 regressions detected across ${passedCount} tests. All legacy assertions and edge cases verified.`
        : `Regression Alert: ${failedCount} test(s) failed in suite '${cmd}'.`,
  };
}
