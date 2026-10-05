import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import {
  MCPToolDefinition,
  RunTestsArgs,
  RunTestsResult,
} from '../types';

export const runTestsDefinition: MCPToolDefinition = {
  name: 'run_tests',
  description:
    'Executes project tests using an allowlisted test runner inside the isolated workspace.',
  inputSchema: {
    type: 'object',
    properties: {
      workspacePath: {
        type: 'string',
        description: 'The root directory of the workspace where tests should execute.',
      },
      testCommand: {
        type: 'string',
        description: 'Allowlisted test command (e.g., "npm test", "pytest", "node tests/auth.test.js").',
      },
      timeoutMs: {
        type: 'number',
        description: 'Maximum allowable test execution duration in milliseconds.',
      },
    },
    required: ['workspacePath'],
  },
};

const ALLOWED_TEST_PREFIXES = [
  'npm test',
  'npm run test',
  'npx vitest',
  'npx jest',
  'pytest',
  'python3 -m unittest',
  'python3 tests/',
  'node tests/',
  'node --test',
  'cargo test',
  'go test',
];

export async function executeRunTests(args: RunTestsArgs): Promise<RunTestsResult> {
  const { workspacePath, testCommand = 'npm test', timeoutMs = 8000 } = args;

  const resolvedDir = path.resolve(workspacePath);
  if (!fs.existsSync(resolvedDir)) {
    throw new Error(`Workspace path does not exist: ${workspacePath}`);
  }

  const normalizedCmd = testCommand.trim();
  const isAllowed = ALLOWED_TEST_PREFIXES.some((prefix) => normalizedCmd.startsWith(prefix));

  if (!isAllowed) {
    throw new Error(
      `Execution Denied: Command '${testCommand}' is not in the allowlisted test runners: ${ALLOWED_TEST_PREFIXES.join(', ')}`
    );
  }

  const parts = normalizedCmd.split(/\s+/);
  const cmd = parts[0];
  const cmdArgs = parts.slice(1);

  const startTime = Date.now();

  return new Promise<RunTestsResult>((resolve) => {
    let stdout = '';
    let stderr = '';
    let killed = false;

    // Stripped environment: zero server secrets passed to user test scripts
    const sanitizedEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
      NODE_ENV: 'test',
      TMPDIR: resolvedDir,
      HOME: process.env.HOME || resolvedDir,
    };

    const child = spawn(cmd, cmdArgs, {
      cwd: resolvedDir,
      env: sanitizedEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stdin?.end();

    const timer = setTimeout(() => {
      killed = true;
      try {
        child.kill('SIGKILL');
      } catch {
        // ignore
      }
    }, timeoutMs);

    child.stdout?.on('data', (chunk) => {
      if (stdout.length < 8000) stdout += chunk.toString();
    });

    child.stderr?.on('data', (chunk) => {
      if (stderr.length < 8000) stderr += chunk.toString();
    });

    child.on('close', (exitCode) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;

      if (killed) {
        return resolve({
          attempted: true,
          success: false,
          command: normalizedCmd,
          stdout: stdout.trim(),
          stderr: (stderr + '\n[Test execution timed out and was killed]').trim(),
          exitCode: -1,
          executionTimeMs: duration,
        });
      }

      resolve({
        attempted: true,
        success: exitCode === 0,
        command: normalizedCmd,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: exitCode ?? 1,
        executionTimeMs: duration,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      const duration = Date.now() - startTime;
      resolve({
        attempted: true,
        success: false,
        command: normalizedCmd,
        stdout: '',
        stderr: `Failed to spawn test runner '${cmd}': ${err.message}`,
        exitCode: 1,
        executionTimeMs: duration,
      });
    });
  });
}
