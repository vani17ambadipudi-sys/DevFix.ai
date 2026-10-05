import { codeExecutionTool } from '../../src/services/codeExecutionTool';
import { MCPToolDefinition, RunCodeArgs, RunCodeResult } from '../types';

export const runCodeDefinition: MCPToolDefinition = {
  name: 'run_code',
  description:
    'Safely execute supported source code (Python, JavaScript, TypeScript) in an isolated sandbox subprocess and return stdout, stderr, and exit code.',
  inputSchema: {
    type: 'object',
    properties: {
      language: {
        type: 'string',
        description: 'The programming language of the code snippet (e.g. Python, JavaScript, TypeScript)',
      },
      code: {
        type: 'string',
        description: 'The complete source code to test in the isolated execution sandbox',
      },
    },
    required: ['language', 'code'],
  },
};

export async function executeRunCode(args: RunCodeArgs): Promise<RunCodeResult> {
  const { language, code } = args;

  if (!language || typeof language !== 'string') {
    throw new Error('Invalid arguments: "language" string is required.');
  }

  if (!code || typeof code !== 'string') {
    throw new Error('Invalid arguments: "code" string is required.');
  }

  // Safety constraint: Maximum code payload limit (64 KB)
  if (code.length > 64 * 1024) {
    throw new Error('Code payload exceeds maximum permitted size of 64KB.');
  }

  const isSupported = codeExecutionTool.isLanguageSupported(language);
  if (!isSupported) {
    return {
      attempted: false,
      success: false,
      stdout: '',
      stderr: '',
      exitCode: 0,
      executionTime: 0,
      reason: `Static analysis only. Execution unavailable for language: "${language}".`,
    };
  }

  const raw = await codeExecutionTool.executeCode(code, language);

  return {
    attempted: true,
    success: raw.success,
    stdout: raw.stdout,
    stderr: raw.stderr,
    exitCode: raw.exitCode,
    executionTime: raw.executionTime,
    reason: raw.reason,
  };
}
