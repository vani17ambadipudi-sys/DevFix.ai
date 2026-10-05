import assert from 'assert';
import { DemoRepositorySeed } from '../../server/data/demoRepository';
import { RepositoryOrchestrator } from '../../src/agents/repository/repositoryOrchestrator';
import { WorkspaceManager } from '../../server/workspace/workspaceManager';
import { db } from '../../server/database/db';

export async function runRepositoryWorkflowIntegrationTests() {
  console.log('  ▶ Running Autonomous Repository Workflow Integration Tests (Section 38)...');

  // 1. Seed fresh demo repository
  const repo = await DemoRepositorySeed.ensureDemoRepository(true);
  assert.strictEqual(repo.name, 'auth-api-demo');

  // 2. Execute full autonomous diagnosis
  const issueDescription = 'Login API returns HTTP 500 when email is empty instead of returning 400 Bad Request.';
  const result = await RepositoryOrchestrator.executeDiagnosis(
    repo,
    issueDescription,
    'Error: Database lookup requires non-empty email string.'
  );

  // 3. Verify reproduction caught the bug
  assert.strictEqual(result.reproduction.attempted, true, 'Reproduction must be attempted');
  assert.strictEqual(result.reproduction.failedAsExpected, true, 'Reproduction script must have reproduced failure');

  // 4. Verify root cause was identified
  assert.strictEqual(result.rootCause.affectedFiles.length > 0, true, 'Affected files must be identified');

  // 5. Verify patch was generated and tested
  assert.strictEqual(result.verification.success, true, 'Reproduction verification must pass after patch');
  assert.strictEqual(result.regression.regressionsDetected, 0, 'Must have 0 regressions');
  assert.strictEqual(result.regression.success, true, 'Regression suite must pass');

  // 6. Verify reviewer approved with low risk
  assert.strictEqual(result.review.approved, true, 'Reviewer must approve verified patch');
  assert.strictEqual(result.review.riskLevel, 'low', 'Risk level should be low');

  // 7. Verify unified diff generated
  assert.strictEqual(result.diffs.length > 0, true, 'Diff must be generated');
  assert.strictEqual(result.combinedDiff.includes('Email is required'), true, 'Diff must contain input check');

  // 8. Verify status is proposed (Awaiting Developer Approval)
  assert.strictEqual(result.status, 'proposed');
  assert.strictEqual(result.requiresDeveloperApproval, true);

  // 9. Developer Approval Simulation
  db.updatePatch(result.patchId, { status: 'approved' });
  const applied = WorkspaceManager.applyApprovedPatchToSource(repo.id, result.patchId);
  assert.strictEqual(applied.success, true, 'Approved patch must successfully apply to source');

  console.log('  ✔ Autonomous Repository Workflow Integration Tests passed.');
}
