import assert from 'assert';
import path from 'path';
import { RepositoryScanner } from '../../server/repository/repositoryScanner';

export async function runRepositoryScannerTests() {
  console.log('  ▶ Running RepositoryScanner tests...');

  // Test 1: Safe relative path checks
  assert.strictEqual(RepositoryScanner.isSafeRelativePath('src/routes/auth.ts'), true, 'Normal relative path must be safe');
  assert.strictEqual(RepositoryScanner.isSafeRelativePath('package.json'), true, 'Manifest in root must be safe');
  assert.strictEqual(RepositoryScanner.isSafeRelativePath('../../etc/passwd'), false, 'Path traversal must be rejected');
  assert.strictEqual(RepositoryScanner.isSafeRelativePath('/etc/shadow'), false, 'Absolute path must be rejected');
  assert.strictEqual(RepositoryScanner.isSafeRelativePath('.env'), false, '.env file must be rejected');
  assert.strictEqual(RepositoryScanner.isSafeRelativePath('.env.production'), false, '.env.production must be rejected');
  assert.strictEqual(RepositoryScanner.isSafeRelativePath('id_rsa'), false, 'SSH private keys must be rejected');
  assert.strictEqual(RepositoryScanner.isSafeRelativePath('keys/server.key'), false, 'Key files must be rejected');

  // Test 2: Project scanning on current codebase
  const metadata = await RepositoryScanner.scan(process.cwd());
  assert.strictEqual(metadata.languages.includes('TypeScript'), true, 'TypeScript must be detected');
  assert.strictEqual(metadata.frameworks.includes('React'), true, 'React must be detected');
  assert.strictEqual(metadata.frameworks.includes('Express'), true, 'Express must be detected');
  assert.strictEqual(metadata.totalFiles > 10, true, 'Scanner must find files');

  console.log('  ✔ RepositoryScanner tests passed.');
}
