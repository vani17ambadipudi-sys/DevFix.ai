import assert from 'assert';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createUnifiedDiff } from '../../mcp-server/tools/generateDiff';
import { executeApplyPatch } from '../../mcp-server/tools/applyPatch';

export async function runPatchSystemTests() {
  console.log('  ▶ Running PatchSystem tests...');

  // Test 1: Unified diff generation
  const oldText = 'const x = 1;\nconst y = 2;\nconsole.log(x);';
  const newText = 'const x = 1;\nconst y = 3;\nconsole.log(x);';
  const diff = createUnifiedDiff('test.js', oldText, newText);

  assert.strictEqual(diff.file, 'test.js');
  assert.strictEqual(diff.additions, 1, 'Should record 1 addition');
  assert.strictEqual(diff.deletions, 1, 'Should record 1 deletion');
  assert.strictEqual(diff.unifiedDiff.includes('+const y = 3;'), true);
  assert.strictEqual(diff.unifiedDiff.includes('-const y = 2;'), true);

  // Test 2: Apply patch in temporary workspace
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devfix_patch_test_'));
  try {
    const applyRes = await executeApplyPatch({
      workspacePath: tempDir,
      file: 'src/config.json',
      patch: '{"version": "1.0.0"}',
      operation: 'create',
    });
    assert.strictEqual(applyRes.success, true);
    assert.strictEqual(fs.existsSync(path.join(tempDir, 'src/config.json')), true);
    const content = fs.readFileSync(path.join(tempDir, 'src/config.json'), 'utf8');
    assert.strictEqual(content, '{"version": "1.0.0"}');

    // Test 3: Path traversal rejection in apply_patch
    let threw = false;
    try {
      await executeApplyPatch({
        workspacePath: tempDir,
        file: '../../outside.txt',
        patch: 'malicious',
      });
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, true, 'Path traversal in apply_patch must throw security violation');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('  ✔ PatchSystem tests passed.');
}
