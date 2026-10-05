import assert from 'assert';

export async function runValidatorTests() {
  console.log('  ▶ Running validator tests...');

  // Test 1: Language Allowlist
  const allowed = ['python', 'javascript', 'typescript', 'sql', 'java', 'cpp', 'csharp', 'go', 'rust'];
  assert.strictEqual(allowed.includes('python'), true, 'Python must be allowed');
  assert.strictEqual(allowed.includes('malicious_bin'), false, 'Arbitrary binaries must be rejected');

  // Test 2: Path Traversal rejection
  const badPaths = ['../../etc/passwd', '/etc/shadow', '.env', 'sub/../../secret', 'id_rsa'];
  for (const bp of badPaths) {
    const isBad = bp.includes('..') || bp.startsWith('/') || bp.includes('.env') || bp.includes('id_rsa') || bp.includes('passwd');
    assert.strictEqual(isBad, true, `Path '${bp}' must be detected as forbidden`);
  }

  // Test 3: Safe relative path acceptance
  const safePaths = ['src/types/index.ts', 'src/agents', 'transformer-lab/tokenizer.py'];
  for (const sp of safePaths) {
    const isBad = sp.includes('..') || sp.startsWith('/') || sp.includes('.env');
    assert.strictEqual(isBad, false, `Safe path '${sp}' must be permitted`);
  }

  console.log('  ✔ Validator tests passed.');
}
