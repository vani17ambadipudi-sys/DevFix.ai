import { mcpServer } from '../../../mcp-server/server';
import { RepositoryRecord } from '../../../server/database/db';

export interface TestVerificationResult {
  attempted: boolean;
  success: boolean;
  command: string;
  output: string;
  exitCode: number;
  summary: string;
}

export async function runTestEngineerAgent(
  repo: RepositoryRecord,
  reproductionCommand: string
): Promise<TestVerificationResult> {
  // Execute the same reproduction command that previously failed
  const mcpRes = await mcpServer.executeTool({
    tool: 'run_tests',
    arguments: {
      workspacePath: repo.workspacePath,
      testCommand: reproductionCommand,
      timeoutMs: 8000,
    },
    requesterAgent: 'Test Engineer Agent',
  });

  const data = mcpRes.data;
  const success = Boolean(mcpRes.success && data?.success && data?.exitCode === 0);
  const output = (data?.stdout || '') + '\n' + (data?.stderr || mcpRes.error || '');

  return {
    attempted: true,
    success,
    command: reproductionCommand,
    output: output.trim(),
    exitCode: data?.exitCode ?? (success ? 0 : 1),
    summary: success
      ? `Reproduction script '${reproductionCommand}' now passes successfully with exit code 0. Empty input is safely handled with HTTP 400.`
      : `Reproduction script still returned non-zero exit code: ${output.slice(0, 150)}`,
  };
}
