import fs from 'fs';
import path from 'path';
import { InspectProjectArgs, InspectProjectResult, MCPToolDefinition } from '../types';

export const inspectProjectDefinition: MCPToolDefinition = {
  name: 'inspect_project',
  description:
    'Provide a safe summary of the project structure and permitted source files without exposing sensitive configurations or credentials.',
  inputSchema: {
    type: 'object',
    properties: {
      subDirectory: {
        type: 'string',
        description: 'Optional sub-directory to inspect (defaults to "src")',
      },
    },
  },
};

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.aistudio',
  'dist',
  '.vite',
  'build',
  'coverage',
]);

const IGNORED_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'bun.lock',
  'package-lock.json',
]);

export async function executeInspectProject(
  args: InspectProjectArgs = {}
): Promise<InspectProjectResult> {
  const workspaceRoot = path.resolve(process.cwd());

  let targetDir = workspaceRoot;
  if (args.subDirectory && typeof args.subDirectory === 'string') {
    if (args.subDirectory.includes('..')) {
      throw new Error('Security Error: Path traversal (..) is prohibited.');
    }
    const cleaned = args.subDirectory.replace(/^[/\\]+/, '');
    const resolved = path.resolve(workspaceRoot, cleaned);
    if (!resolved.startsWith(workspaceRoot)) {
      throw new Error('Security Error: Target directory outside project root.');
    }
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      targetDir = resolved;
    }
  }

  const files: string[] = [];
  const directories: string[] = [];

  function scan(currentPath: string, depth = 0) {
    if (depth > 5) return; // avoid deep recursions

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryName = entry.name;
      const fullPath = path.join(currentPath, entryName);
      const relative = path.relative(workspaceRoot, fullPath);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entryName) && !entryName.startsWith('.')) {
          directories.push(relative);
          scan(fullPath, depth + 1);
        }
      } else if (entry.isFile()) {
        if (
          !IGNORED_FILES.has(entryName) &&
          !entryName.startsWith('.env') &&
          !entryName.endsWith('.key') &&
          !entryName.endsWith('.pem')
        ) {
          files.push(relative);
        }
      }
    }
  }

  scan(targetDir);

  // Read project name from package.json if present
  let projectName = 'DevFix AI';
  try {
    const pkgPath = path.join(workspaceRoot, 'package.json');
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      if (pkg.name) projectName = pkg.name;
    }
  } catch {
    // fallback
  }

  return {
    projectName,
    files: files.slice(0, 100), // safety ceiling
    directories: directories.slice(0, 50),
    totalFiles: files.length,
  };
}
