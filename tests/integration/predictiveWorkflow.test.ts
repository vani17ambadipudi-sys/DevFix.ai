import assert from 'assert';
import { PredictionManagerAgent } from '../../src/agents/prediction/predictionManagerAgent';
import { db } from '../../server/database/db';

export async function runPredictiveWorkflowIntegrationTests() {
  console.log('  ▶ Running Predictive Workflow Integration Tests (Phase 10)...');

  // 1. Run full predictive analysis through the Prediction Manager Agent
  const result = await PredictionManagerAgent.execute('repo_demo_01');
  assert.strictEqual(result.success, true, 'PredictionManagerAgent must return success');
  assert(result.report, 'Prediction report must be generated');
  assert(result.managerSummary.length > 0, 'Manager summary text required');

  const report = result.report;

  // 2. Verify signal count and risk areas
  assert(report.totalSignalsAnalyzed > 10, 'Must analyze multiple signals across dimensions');
  assert(report.riskAreas.length >= 3, 'Must identify evaluated risk areas (payments, auth, reports, users)');

  // 3. Verify Payments is identified as High Risk
  const paymentsRisk = report.riskAreas.find((r) => r.area === 'src/payments');
  assert(paymentsRisk, 'Payments module must be evaluated');
  assert.strictEqual(paymentsRisk.riskLevel, 'high', 'Payments module must be high risk');
  assert(paymentsRisk.primaryDrivers.length > 0, 'Must provide explainable primary drivers');
  assert(paymentsRisk.evidence.length >= 3, 'Must correlate test, change, and performance evidence');

  // 4. Verify Auth is identified as Medium Risk
  const authRisk = report.riskAreas.find((r) => r.area === 'src/auth');
  assert(authRisk, 'Auth module must be evaluated');
  assert.strictEqual(authRisk.riskLevel, 'medium', 'Auth module must be medium risk');

  // 5. Verify 4-Week Trend Timeline
  assert.strictEqual(report.timeline.length, 4, 'Timeline must contain exactly 4 weeks of telemetry');
  assert(report.timeline[3].period.includes('Week 4'), 'Week 4 must represent latest period');

  // 6. Verify Change Hotspots
  assert(report.hotspots.length >= 2, 'Must include change hotspots');
  const topHotspot = report.hotspots[0];
  assert(topHotspot.changesCount > 0, 'Hotspot must have recorded changes');

  // 7. Verify Preventive Recommendations
  assert(report.recommendations.length > 0, 'Must formulate preventive recommendations');
  const firstRec = report.recommendations[0];
  assert(firstRec.id.length > 0, 'Recommendation ID required');
  assert(firstRec.action.length > 0, 'Actionable guidance required');
  assert.strictEqual(firstRec.status, 'proposed', 'Initial status must be proposed');

  // 8. Test Recommendation Status Transition (Developer Approval/Decision)
  const updated = db.updateRecommendationStatus(firstRec.id, 'accepted');
  assert.strictEqual(updated, true, 'Updating recommendation status must succeed');

  const updatedRecs = db.getPreventiveRecommendations();
  const found = updatedRecs.find((r) => r.id === firstRec.id);
  assert(found, 'Updated recommendation must exist in database');
  assert.strictEqual(found.status, 'accepted', 'Recommendation status must be accepted');

  // 9. Verify Database Persistence of Prediction Run
  const savedRun = db.getPredictionRunById(report.id);
  assert(savedRun, 'Prediction run must be persisted in database');
  assert.strictEqual(savedRun.status, 'completed', 'Run status must be completed');

  console.log('  ✔ Predictive Workflow Integration Tests passed.');
}
