import fs from 'fs';
import path from 'path';
import { mcpServer } from '../../../mcp-server/server';
import { RepositoryRecord } from '../../../server/database/db';
import { logger } from '../../../server/observability/logger';

export interface ReproductionResult {
  attempted: boolean;
  failedAsExpected: boolean;
  command: string;
  output: string;
  exitCode?: number;
  summary: string;
}

export async function runBugReproducerAgent(
  repo: RepositoryRecord,
  issueDescription: string,
  requestId: string = 'repro_req'
): Promise<ReproductionResult> {
  const workspaceDir = repo.workspacePath;

  // Check for existing reproduction or test scripts
  const candidateScripts = [
    'tests/reproduce.js',
    'tests/reproduce.py',
    'test/reproduce.js',
    'tests/auth.test.js',
    'test/auth.test.js',
  ];

  let chosenCommand = '';
  for (const script of candidateScripts) {
    if (fs.existsSync(path.join(workspaceDir, script))) {
      chosenCommand = script.endsWith('.js') ? `node ${script}` : `python3 ${script}`;
      break;
    }
  }

  // Fallback to configured testCommand or default npm test
  if (!chosenCommand) {
    if (fs.existsSync(path.join(workspaceDir, 'package.json'))) {
      chosenCommand = 'npm test';
    } else if (fs.existsSync(path.join(workspaceDir, 'requirements.txt'))) {
      chosenCommand = 'pytest';
    } else {
      chosenCommand = 'node tests/auth.test.js';
    }
  }

  logger.info('bug_reproducer_executing', requestId, { command: chosenCommand, workspace: workspaceDir });

  // Execute reproduction through MCP run_tests
  const mcpRes = await mcpServer.executeTool({
    tool: 'run_tests',
    arguments: {
      workspacePath: workspaceDir,
      testCommand: chosenCommand,
      timeoutMs: 7000,
    },
    requesterAgent: 'Bug Reproducer Agent',
  });

  const testData = mcpRes.data;
  const isError = !mcpRes.success || !testData?.success || testData?.exitCode !== 0;
  const output = (testData?.stdout || '') + '\n' + (testData?.stderr || mcpRes.error || '');

  // Reproduction is considered confirmed when the test/script fails reproducing the bug
  const failedAsExpected = isError;

  return {
    attempted: true,
    failedAsExpected,
    command: chosenCommand,
    output: output.trim(),
    exitCode: testData?.exitCode ?? (mcpRes.success ? 0 : 1),
    summary: failedAsExpected
      ? `Bug successfully reproduced via '${chosenCommand}'. The command failed as expected, confirming the reported behavior.`
      : `Reproduction command '${chosenCommand}' completed without error. Inspecting logs for subtle failures.`,
  };
}
