import { mcpClient } from '../services/mcpClient';
import { TestResult } from '../types';

export const TESTER_SYSTEM_INSTRUCTION = `You are the Tester Agent.

Your responsibility is verification.
Use the available MCP code execution tool (run_code) when supported.

Inspect:
- stdout
- stderr
- exit code
- execution status
- runtime behavior

Never fabricate test results.
Return structured JSON.`;

export async function runTesterAgent(
  code: string,
  language: string,
  attempt: number = 1
): Promise<TestResult> {
  // Delegate execution strictly through MCP Client -> DevFix MCP Server -> run_code
  const mcpResult = await mcpClient.runCode(
    {
      language,
      code,
    },
    'Tester'
  );

  return {
    attempted: mcpResult.attempted,
    success: mcpResult.success,
    stdout: mcpResult.stdout,
    stderr: mcpResult.stderr,
    exitCode: mcpResult.exitCode,
    executionTime: mcpResult.executionTime,
    attempt,
    attempts: attempt,
    reason: mcpResult.reason,
  };
}
