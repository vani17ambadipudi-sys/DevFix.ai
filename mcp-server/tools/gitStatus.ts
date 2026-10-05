import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import {
  MCPToolDefinition,
  GitStatusArgs,
  GitStatusResult,
} from '../types';

export const gitStatusDefinition: MCPToolDefinition = {
  name: 'git_status',
  description:
    'Read-only inspection of git status within the workspace directory without performing any modifications.',
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

export async function executeGitStatus(args: GitStatusArgs): Promise<GitStatusResult> {
  const { workspacePath } = args;
  const resolved = path.resolve(workspacePath);

  const hasGit = fs.existsSync(path.join(resolved, '.git'));
  if (!hasGit) {
    return {
      isGitRepo: false,
      modifiedFiles: [],
      untrackedFiles: [],
    };
  }

  try {
    const res = spawnSync('git', ['status', '--porcelain', '-b'], {
      cwd: resolved,
      encoding: 'utf8',
      timeout: 3000,
    });

    const lines = (res.stdout || '').split('\n').filter((l) => l.trim().length > 0);
    let branch = 'main';
    const modified: string[] = [];
    const untracked: string[] = [];

    for (const line of lines) {
      if (line.startsWith('##')) {
        branch = line.replace('##', '').trim();
      } else if (line.startsWith('??')) {
        untracked.push(line.slice(3).trim());
      } else {
        modified.push(line.slice(3).trim());
      }
    }

    return {
      isGitRepo: true,
      branch,
      modifiedFiles: modified,
      untrackedFiles: untracked,
    };
  } catch {
    return {
      isGitRepo: true,
      modifiedFiles: [],
      untrackedFiles: [],
    };
  }
}
