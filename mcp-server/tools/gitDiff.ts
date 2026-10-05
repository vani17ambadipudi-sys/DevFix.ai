import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { MCPToolDefinition } from '../types';

export const gitDiffDefinition: MCPToolDefinition = {
  name: 'git_diff',
  description:
    'Read-only inspection of git diff in the workspace without staging, committing, or pushing.',
  inputSchema: {
    type: 'object',
    properties: {
      workspacePath: {
        type: 'string',
        description: 'The root directory of the workspace.',
      },
    },
    required: ['workspacePath'],
  },
};

export async function executeGitDiff(args: { workspacePath: string }): Promise<{ diff: string; isGitRepo: boolean }> {
  const { workspacePath } = args;
  const resolved = path.resolve(workspacePath);

  if (!fs.existsSync(path.join(resolved, '.git'))) {
    return { isGitRepo: false, diff: '' };
  }

  try {
    const res = spawnSync('git', ['diff'], {
      cwd: resolved,
      encoding: 'utf8',
      timeout: 4000,
    });
    return {
      isGitRepo: true,
      diff: res.stdout || '',
    };
  } catch (err: any) {
    return {
      isGitRepo: true,
      diff: '',
    };
  }
}
