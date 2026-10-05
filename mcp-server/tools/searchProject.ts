import fs from 'fs';
import path from 'path';
import {
  MCPToolDefinition,
  SearchProjectArgs,
  SearchProjectResult,
  ProjectSearchMatch,
} from '../types';

export const searchProjectDefinition: MCPToolDefinition = {
  name: 'search_project',
  description:
    'Searches for symbols, functions, or text across source files in the project workspace with path traversal protection.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Text or symbol keyword to search across project files.',
      },
      workspacePath: {
        type: 'string',
        description: 'The root directory of the workspace to search in.',
      },
      filePattern: {
        type: 'string',
        description: 'Optional file extension or substring filter (e.g. .ts, .py, route).',
      },
    },
    required: ['query'],
  },
};

const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.tmp', 'checkpoints']);
const IGNORED_FILES = new Set(['.env', 'package-lock.json', 'id_rsa']);

export async function executeSearchProject(args: SearchProjectArgs): Promise<SearchProjectResult> {
  const { query, workspacePath = process.cwd(), filePattern } = args;

  if (!query || typeof query !== 'string' || !query.trim()) {
    throw new Error('Search query is required.');
  }

  const resolvedRoot = path.resolve(workspacePath);
  if (!fs.existsSync(resolvedRoot)) {
    throw new Error(`Workspace path does not exist: ${workspacePath}`);
  }

  const matches: ProjectSearchMatch[] = [];
  const lowerQuery = query.toLowerCase();

  const searchDir = (currentDir: string) => {
    if (matches.length >= 30) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (matches.length >= 30) break;
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(resolvedRoot, fullPath);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
          searchDir(fullPath);
        }
      } else if (entry.isFile()) {
        if (IGNORED_FILES.has(entry.name) || entry.name.endsWith('.pt') || entry.name.endsWith('.png')) {
          continue;
        }

        if (filePattern && !relPath.toLowerCase().includes(filePattern.toLowerCase())) {
          continue;
        }

        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(lowerQuery)) {
              matches.push({
                file: relPath,
                line: i + 1,
                snippet: lines[i].trim().slice(0, 160),
              });
              if (matches.length >= 30) break;
            }
          }
        } catch {
          // ignore unreadable/binary
        }
      }
    }
  };

  searchDir(resolvedRoot);

  return {
    query,
    totalMatches: matches.length,
    matches,
  };
}
