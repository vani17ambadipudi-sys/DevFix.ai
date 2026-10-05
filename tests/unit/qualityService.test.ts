import assert from 'assert';
import { ContinuousQualityService } from '../../src/services/qualityService';

export async function runContinuousQualityTests() {
  console.log('  ▶ Running Continuous Quality Service Unit Tests (Phase 9)...');

  // Test 1: Real-time Quality Health Metrics Computation
  const metrics = ContinuousQualityService.getQualityMetrics('repo_demo_01');
  assert(metrics !== null, 'Metrics must not be null');
  assert(metrics.healthScore >= 0 && metrics.healthScore <= 100, 'Health score must be between 0 and 100');
  assert(['A+', 'A', 'B', 'C', 'D'].includes(metrics.grade), 'Grade must be a valid letter grade');
  assert.strictEqual(metrics.monitoringStatus, 'active', 'Monitoring status must be active');
  assert.strictEqual(metrics.gates.length, 5, 'Must evaluate 5 core quality gates');

  // Test 2: Verify Quality Gates
  const gateIds = metrics.gates.map((g) => g.id);
  assert(gateIds.includes('gate-build'), 'Must include build gate');
  assert(gateIds.includes('gate-test'), 'Must include test gate');
  assert(gateIds.includes('gate-security'), 'Must include security gate');
  assert(gateIds.includes('gate-deps'), 'Must include dependency gate');
  assert(gateIds.includes('gate-flaky'), 'Must include flaky test gate');

  for (const gate of metrics.gates) {
    assert(['passed', 'warning', 'failed'].includes(gate.status), `Gate ${gate.name} must have valid status`);
    assert(gate.score >= 0 && gate.score <= 100, `Gate ${gate.name} score must be 0-100`);
    assert(gate.metricLabel.length > 0, `Gate ${gate.name} must have descriptive label`);
  }

  // Test 3: Alert Generation & Resolution
  if (metrics.alerts.length > 0) {
    const firstAlert = metrics.alerts[0];
    assert(firstAlert.id.length > 0, 'Alert must have id');
    assert(['critical', 'warning', 'info'].includes(firstAlert.severity), 'Alert must have valid severity');
    assert(firstAlert.suggestedAction.length > 0, 'Alert must have suggested action');

    // Test resolving the alert
    ContinuousQualityService.resolveAlert(firstAlert.id);
    const updatedMetrics = ContinuousQualityService.getQualityMetrics('repo_demo_01');
    const resolved = updatedMetrics.alerts.find((a) => a.id === firstAlert.id);
    assert.strictEqual(resolved?.resolved, true, 'Alert must be marked resolved');
  }

  // Test 4: Trigger Continuous Maintenance Cycle
  const cycleResult = await ContinuousQualityService.triggerContinuousMaintenanceCycle('repo_demo_01');
  assert(cycleResult.scanId.startsWith('qscan_'), 'Scan ID must be prefixed with qscan_');
  assert(cycleResult.durationMs >= 0, 'Duration must be non-negative');
  assert(cycleResult.metrics.healthScore > 0, 'Health score must be greater than 0');

  console.log('  ✔ Continuous Quality Service Unit Tests passed.');
}
