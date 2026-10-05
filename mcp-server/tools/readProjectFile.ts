import fs from 'fs';
import path from 'path';
import { MCPToolDefinition, ReadProjectFileArgs, ReadProjectFileResult } from '../types';

export const readProjectFileDefinition: MCPToolDefinition = {
  name: 'read_project_file',
  description:
    'Read a permitted project source file so agents can inspect project context beyond the pasted snippet. Path-protected and restricts access outside project boundaries.',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Relative path to the project file (e.g. "src/App.tsx", "src/types/index.ts")',
      },
    },
    required: ['path'],
  },
};

const BLOCKED_PATTERNS = [
  /\.env(\..+)?$/i,
  /\.git(\/|\\|$)/i,
  /node_modules(\/|\\|$)/i,
  /id_rsa/i,
  /\.(pem|key|pfx|pkcs12)$/i,
  /secret/i,
  /credential/i,
  /password/i,
  /token/i,
];

export async function executeReadProjectFile(
  args: ReadProjectFileArgs
): Promise<ReadProjectFileResult> {
  const rawPath = args.path;

  if (!rawPath || typeof rawPath !== 'string' || !rawPath.trim()) {
    throw new Error('Invalid arguments: "path" string is required.');
  }

  // Reject explicit path traversal sequences
  if (rawPath.includes('..') || rawPath.startsWith('~')) {
    throw new Error('Security Error: Path traversal (..) is strictly prohibited.');
  }

  const workspaceRoot = path.resolve(process.cwd());
  // Normalize and resolve against workspace root
  const cleaned = rawPath.replace(/^[/\\]+/, ''); // strip leading slashes
  const targetPath = path.resolve(workspaceRoot, cleaned);

  // Enforce boundary: target must be inside workspaceRoot
  if (!targetPath.startsWith(workspaceRoot)) {
    throw new Error('Security Error: Access to files outside the project root is forbidden.');
  }

  const relativePath = path.relative(workspaceRoot, targetPath);

  // Check blocked sensitive patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(relativePath)) {
      throw new Error(`Security Error: Access to sensitive file pattern is blocked: "${relativePath}".`);
    }
  }

  if (!fs.existsSync(targetPath)) {
    throw new Error(`File not found: "${relativePath}".`);
  }

  const stat = fs.statSync(targetPath);
  if (!stat.isFile()) {
    throw new Error(`Specified path is not a regular file: "${relativePath}".`);
  }

  // File size limit: 256KB
  if (stat.size > 256 * 1024) {
    throw new Error(`File size (${Math.round(stat.size / 1024)}KB) exceeds 256KB limit.`);
  }

  const content = fs.readFileSync(targetPath, 'utf-8');
  const linesCount = content.split('\n').length;

  return {
    path: relativePath,
    content,
    sizeBytes: stat.size,
    linesCount,
  };
}
