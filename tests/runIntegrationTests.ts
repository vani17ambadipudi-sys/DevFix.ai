import { runE2ePipelineTests } from './integration/e2ePipeline.test';
import { runFailureModesTests } from './integration/failureModes.test';
import { runRepositoryWorkflowIntegrationTests } from './integration/repositoryWorkflow.test';
import { runPredictiveWorkflowIntegrationTests } from './integration/predictiveWorkflow.test';

async function main() {
  console.log('================================================================');
  console.log('DevFix AI — Integration Test Suite (Stages 3, 7, 8, 10)');
  console.log('================================================================');

  const start = Date.now();
  let passed = 0;
  let failed = 0;

  const integrationSuites: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: 'Integration: Single-Snippet E2E Pipeline (Stage 3 & 7)', fn: runE2ePipelineTests },
    { name: 'Integration: Failure Modes & Watchdog Timeouts', fn: runFailureModesTests },
    { name: 'Integration: Autonomous Repository Workflow (Stage 8)', fn: runRepositoryWorkflowIntegrationTests },
    { name: 'Integration: Predictive Workflow & Recommendation Decisions (Phase 10)', fn: runPredictiveWorkflowIntegrationTests },
  ];

  for (const suite of integrationSuites) {
    try {
      console.log(`\n• [Integration Suite] ${suite.name}`);
      await suite.fn();
      passed++;
    } catch (err: any) {
      console.error(`  ✖ FAILED: ${err.message}`);
      failed++;
    }
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log('\n================================================================');
  console.log(`Integration Test Execution Summary: ${passed} passed, ${failed} failed in ${duration}s`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Integration test runner fatal error:', err);
  process.exit(1);
});
