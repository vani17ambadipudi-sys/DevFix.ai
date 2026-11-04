import assert from 'assert';
import { CicdService } from '../../server/services/cicdService';
import { db } from '../../server/database/db';

export async function runCicdPipelineTests() {
  console.log('  ▶ Running CI/CD Pipeline & Health Check unit tests...');

  // 1. Test Database Live Health Check
  const dbHealth = db.checkHealth();
  assert.strictEqual(typeof dbHealth.status, 'string', 'dbHealth.status must be a string');
  assert.strictEqual(typeof dbHealth.isLoaded, 'boolean', 'dbHealth.isLoaded must be a boolean');
  assert.strictEqual(typeof dbHealth.recordsCount, 'number', 'recordsCount must be a number');
  assert.strictEqual(dbHealth.recordsCount > 0, true, 'recordsCount must be greater than 0');
  assert.strictEqual(typeof dbHealth.writable, 'boolean', 'writable must be a boolean');
  assert.strictEqual(dbHealth.status, 'healthy', 'Database must be healthy in test environment');

  // 2. Test CicdService Unconfigured Mode (No Fake Data)
  const status = await CicdService.getPipelineStatus();
  assert.strictEqual(typeof status, 'object', 'Status must be an object');
  assert.strictEqual(typeof status.configured, 'boolean', 'configured must be a boolean');
  assert.strictEqual(Array.isArray(status.recentFailures), true, 'recentFailures must be an array');
  assert.strictEqual(typeof status.pipelineDefinition, 'object', 'pipelineDefinition must be present');
  assert.strictEqual(status.pipelineDefinition.requiredStages.length >= 12, true, 'Pipeline must define all 12 stages');

  // Verify that if unconfigured, latestRun is null and not fabricated
  if (!status.configured) {
    assert.strictEqual(status.latestRun, null, 'Must NOT generate fake workflow runs when unconfigured');
    assert.strictEqual(typeof status.message, 'string', 'Must provide helpful unconfigured message');
  }

  // 3. Test Stages Integrity in Pipeline Definition
  const stages = status.pipelineDefinition.requiredStages;
  assert.strictEqual(stages.some((s) => s.toLowerCase().includes('lint')), true, 'Lint stage must exist');
  assert.strictEqual(stages.some((s) => s.toLowerCase().includes('typecheck')), true, 'Typecheck stage must exist');
  assert.strictEqual(stages.some((s) => s.toLowerCase().includes('unit test')), true, 'Unit test stage must exist');
  assert.strictEqual(stages.some((s) => s.toLowerCase().includes('integration test')), true, 'Integration test stage must exist');
  assert.strictEqual(stages.some((s) => s.toLowerCase().includes('docker')), true, 'Docker validation stage must exist');
  assert.strictEqual(stages.some((s) => s.toLowerCase().includes('render')), true, 'Render deployment stage must exist');

  // 4. Test Token Safety: ensure token is never exposed in the response
  assert.strictEqual((status as any).token, undefined, 'GitHub token must never be exposed');
  assert.strictEqual((status as any).githubToken, undefined, 'GitHub token must never be exposed');

  // 5. Test Dockerfile PEP 668 Virtual Environment Configuration
  const fs = await import('fs');
  const path = await import('path');
  const dockerfilePath = path.resolve(process.cwd(), 'Dockerfile');
  assert.strictEqual(fs.existsSync(dockerfilePath), true, 'Dockerfile must exist');
  const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
  assert.strictEqual(dockerfileContent.includes('python3-venv'), true, 'Dockerfile must install python3-venv');
  assert.strictEqual(dockerfileContent.includes('python3 -m venv /opt/venv'), true, 'Dockerfile must create /opt/venv to resolve PEP 668');
  assert.strictEqual(dockerfileContent.includes('/opt/venv/bin'), true, 'Dockerfile must configure /opt/venv/bin on PATH');
  assert.strictEqual(dockerfileContent.includes('devfixuser'), true, 'Dockerfile must configure non-root user devfixuser');

  console.log('  ✔ CI/CD Pipeline & Health Check tests passed.');
}
