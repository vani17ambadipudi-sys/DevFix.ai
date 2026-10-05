import fs from 'fs';
import path from 'path';

export interface ProjectMetadata {
  name: string;
  rootPath: string;
  languages: string[];
  frameworks: string[];
  packageManager?: string;
  testFramework?: string;
  entryPoints: string[];
  testDirectories: string[];
  testCommand?: string;
  files: string[];
  directories: string[];
  totalFiles: number;
  totalSize: number;
}

const FORBIDDEN_DIRS = new Set([
  'node_modules',
  '.git',
  '.svn',
  '__pycache__',
  '.pytest_cache',
  '.venv',
  'venv',
  'env',
  'dist',
  'build',
  'coverage',
  '.next',
  '.nuxt',
  'target',
]);

const FORBIDDEN_FILES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'id_rsa',
  'id_dsa',
  'id_ecdsa',
  'id_ed25519',
]);

const SENSITIVE_EXTENSIONS = new Set([
  '.pem',
  '.key',
  '.crt',
  '.pfx',
  '.p12',
  '.secret',
]);

export class RepositoryScanner {
  public static async scan(dirPath: string): Promise<ProjectMetadata> {
    const resolvedRoot = path.resolve(dirPath);
    if (!fs.existsSync(resolvedRoot)) {
      throw new Error(`Directory does not exist: ${dirPath}`);
    }

    const files: string[] = [];
    const directories: string[] = [];
    let totalSize = 0;

    const walk = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.relative(resolvedRoot, fullPath);

        if (entry.isDirectory()) {
          if (FORBIDDEN_DIRS.has(entry.name) || entry.name.startsWith('.')) {
            continue;
          }
          directories.push(relPath);
          walk(fullPath);
        } else if (entry.isFile()) {
          if (FORBIDDEN_FILES.has(entry.name) || SENSITIVE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
            continue;
          }
          try {
            const stat = fs.statSync(fullPath);
            totalSize += stat.size;
            files.push(relPath);
          } catch {
            // Ignore unreadable files
          }
        }
      }
    };

    walk(resolvedRoot);

    // Language Detection
    const languages = new Set<string>();
    const extCounts: Record<string, number> = {};

    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      extCounts[ext] = (extCounts[ext] || 0) + 1;
      if (ext === '.ts' || ext === '.tsx') languages.add('TypeScript');
      else if (ext === '.js' || ext === '.jsx' || ext === '.mjs') languages.add('JavaScript');
      else if (ext === '.py') languages.add('Python');
      else if (ext === '.go') languages.add('Go');
      else if (ext === '.rs') languages.add('Rust');
      else if (ext === '.java') languages.add('Java');
      else if (ext === '.cpp' || ext === '.cc' || ext === '.cxx') languages.add('C++');
      else if (ext === '.c' || ext === '.h') languages.add('C');
      else if (ext === '.sql') languages.add('SQL');
      else if (ext === '.html') languages.add('HTML');
      else if (ext === '.css') languages.add('CSS');
    }

    // Framework and Manifest Detection
    const frameworks = new Set<string>();
    let packageManager: string | undefined;
    let testFramework: string | undefined;
    let testCommand: string | undefined;

    // Check package.json
    const packageJsonPath = path.join(resolvedRoot, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      packageManager = 'npm';
      try {
        const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };

        if (allDeps.react) frameworks.add('React');
        if (allDeps.express) frameworks.add('Express');
        if (allDeps.next) frameworks.add('Next.js');
        if (allDeps.vue) frameworks.add('Vue');
        if (allDeps.fastify) frameworks.add('Fastify');
        if (allDeps.vitest) {
          testFramework = 'Vitest';
          testCommand = 'npx vitest run';
        } else if (allDeps.jest) {
          testFramework = 'Jest';
          testCommand = 'npm test';
        } else if (pkg.scripts?.test) {
          testFramework = 'NPM Test';
          testCommand = 'npm test';
        }
      } catch {
        // ignore parse error
      }
    }

    // Check Python manifests
    if (fs.existsSync(path.join(resolvedRoot, 'requirements.txt')) || fs.existsSync(path.join(resolvedRoot, 'pyproject.toml'))) {
      languages.add('Python');
      packageManager = 'pip';
      testFramework = 'pytest';
      testCommand = 'pytest';
      const reqPath = path.join(resolvedRoot, 'requirements.txt');
      if (fs.existsSync(reqPath)) {
        const content = fs.readFileSync(reqPath, 'utf8');
        if (content.includes('fastapi')) frameworks.add('FastAPI');
        if (content.includes('flask')) frameworks.add('Flask');
        if (content.includes('django')) frameworks.add('Django');
      }
    }

    // Check Cargo / Rust
    if (fs.existsSync(path.join(resolvedRoot, 'Cargo.toml'))) {
      languages.add('Rust');
      packageManager = 'cargo';
      testFramework = 'cargo test';
      testCommand = 'cargo test';
    }

    // Check Go
    if (fs.existsSync(path.join(resolvedRoot, 'go.mod'))) {
      languages.add('Go');
      packageManager = 'go';
      testFramework = 'go test';
      testCommand = 'go test ./...';
    }

    // Entry points detection
    const entryPoints: string[] = [];
    const candidateEntryPoints = [
      'server.ts',
      'src/server.ts',
      'src/index.ts',
      'src/main.tsx',
      'src/App.tsx',
      'index.js',
      'src/index.js',
      'main.py',
      'app.py',
      'src/main.py',
      'cmd/main.go',
      'src/main.rs',
    ];

    for (const ep of candidateEntryPoints) {
      if (files.includes(ep)) {
        entryPoints.push(ep);
      }
    }

    // Test directories detection
    const testDirectories = directories.filter((d) =>
      ['test', 'tests', '__tests__', 'spec', 'src/tests', 'src/__tests__'].includes(d)
    );

    return {
      name: path.basename(resolvedRoot),
      rootPath: resolvedRoot,
      languages: Array.from(languages),
      frameworks: Array.from(frameworks),
      packageManager,
      testFramework,
      testCommand,
      entryPoints,
      testDirectories,
      files,
      directories,
      totalFiles: files.length,
      totalSize,
    };
  }

  /**
   * Safe check for path traversal or access outside permitted directory.
   */
  public static isSafeRelativePath(relPath: string): boolean {
    if (!relPath || typeof relPath !== 'string') return false;
    const normalized = path.normalize(relPath);
    if (
      normalized.startsWith('..') ||
      path.isAbsolute(normalized) ||
      normalized.includes('/../') ||
      normalized.includes('\\..\\')
    ) {
      return false;
    }

    // Check forbidden files or sensitive extensions
    const basename = path.basename(normalized);
    if (FORBIDDEN_FILES.has(basename)) return false;
    if (SENSITIVE_EXTENSIONS.has(path.extname(basename).toLowerCase())) return false;

    return true;
  }
}
