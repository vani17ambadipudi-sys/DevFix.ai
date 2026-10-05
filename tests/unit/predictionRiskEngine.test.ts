import assert from 'assert';
import { RiskEngine } from '../../src/prediction/riskEngine';
import { EvidenceEngine } from '../../src/prediction/evidenceEngine';
import { ModuleSignals } from '../../src/prediction/signalAggregator';

export async function runPredictionRiskEngineTests() {
  console.log('  ▶ Running Prediction & Risk Engine Unit Tests (Phase 10)...');

  // Test 1: High Risk Evaluation (Payments module scenario with 8 failures, 5 changes, 3 fixes)
  const paymentsSignals: ModuleSignals = {
    module: 'src/payments',
    testFailures: 8,
    testRuns: 20,
    recentChanges: 5,
    maintenanceEvents: 3,
    securityFindings: 1,
    outdatedDependencies: 1,
    p95LatencyMs: 780,
    signals: [],
  };

  const highRiskResult = RiskEngine.evaluate(paymentsSignals);
  assert.strictEqual(highRiskResult.riskLevel, 'high', 'Payments module must be classified as high risk');
  assert.strictEqual(highRiskResult.confidence, 'high', 'Confidence should be high with multiple corroborated signals');
  assert(highRiskResult.score >= 65, 'High risk score must be >= 65');
  assert(highRiskResult.primaryDrivers.some((d) => d.includes('test failures')), 'Drivers must cite test failures');

  // Test 2: Medium Risk Evaluation (Auth module with 4 failures, 3 changes)
  const authSignals: ModuleSignals = {
    module: 'src/auth',
    testFailures: 4,
    testRuns: 15,
    recentChanges: 3,
    maintenanceEvents: 1,
    securityFindings: 0,
    outdatedDependencies: 0,
    p95LatencyMs: 240,
    signals: [],
  };

  const medRiskResult = RiskEngine.evaluate(authSignals);
  assert.strictEqual(medRiskResult.riskLevel, 'medium', 'Auth module should be classified as medium risk');
  assert.strictEqual(medRiskResult.confidence, 'high', 'Confidence should be high with 15 test runs');

  // Test 3: Low Risk Evaluation (Stable module with 0 failures, 1 change)
  const stableSignals: ModuleSignals = {
    module: 'src/users',
    testFailures: 0,
    testRuns: 10,
    recentChanges: 1,
    maintenanceEvents: 0,
    securityFindings: 0,
    outdatedDependencies: 0,
    p95LatencyMs: 95,
    signals: [],
  };

  const lowRiskResult = RiskEngine.evaluate(stableSignals);
  assert.strictEqual(lowRiskResult.riskLevel, 'low', 'Stable module should be classified as low risk');

  // Test 4: Unknown Risk Evaluation (No telemetry data recorded anywhere)
  const unknownSignals: ModuleSignals = {
    module: 'src/untracked',
    testFailures: 0,
    testRuns: 0,
    recentChanges: 0,
    maintenanceEvents: 0,
    securityFindings: 0,
    outdatedDependencies: 0,
    p95LatencyMs: 0,
    signals: [],
  };

  const unknownResult = RiskEngine.evaluate(unknownSignals);
  assert.strictEqual(unknownResult.riskLevel, 'unknown', 'Module without data must return unknown risk');
  assert.strictEqual(unknownResult.confidence, 'low', 'Confidence must be low when no data exists');

  // Test 5: Evidence Engine Generation & 5-Layer Invariants
  const evidenceList = EvidenceEngine.generateEvidence(paymentsSignals);
  assert(evidenceList.length >= 3, 'Must generate multiple evidence items for payments');
  const testEvidence = evidenceList.find((e) => e.category === 'test');
  assert(testEvidence, 'Test evidence item must exist');
  assert(testEvidence.observation.length > 0, 'Observation layer required');
  assert(testEvidence.evidenceText.includes('8'), 'Measured numerical evidence required');
  assert(testEvidence.interpretation.length > 0, 'Interpretation layer required');
  assert(testEvidence.uncertainty.length > 0, 'Explicit uncertainty limitation required');

  console.log('  ✔ Prediction & Risk Engine Unit Tests passed.');
}
