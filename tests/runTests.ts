import { runValidatorTests } from './unit/validator.test';
import { runSandboxTests } from './unit/sandbox.test';
import { runModelRouterTests } from './unit/modelRouter.test';
import { runMcpServerTests } from './unit/mcpServer.test';
import { runE2ePipelineTests } from './integration/e2ePipeline.test';
import { runFailureModesTests } from './integration/failureModes.test';

// Phase 8 Test Suites
import { runRepositoryScannerTests } from './unit/repositoryScanner.test';
import { runPatchSystemTests } from './unit/patchSystem.test';
import { runRepositoryWorkflowIntegrationTests } from './integration/repositoryWorkflow.test';

// Phase 9 Continuous Quality & Web Technologies Test Suites
import { runContinuousQualityTests } from './unit/qualityService.test';
import { runWebTechnologiesTests } from './unit/webTechnologies.test';

// Phase 10 Predictive Software Engineering Test Suites
import { runPredictionRiskEngineTests } from './unit/predictionRiskEngine.test';
import { runMcpPredictionToolsTests } from './unit/mcpPredictionTools.test';
import { runPredictiveWorkflowIntegrationTests } from './integration/predictiveWorkflow.test';

async function main() {
  console.log('================================================================');
  console.log('DevFix AI — Production Test Suite (Stages 1 through 10)');
  console.log('================================================================');

  const start = Date.now();
  let passed = 0;
  let failed = 0;

  const suites: Array<{ name: string; fn: () => Promise<void> }> = [
    { name: 'Unit: Request & Path Validator', fn: runValidatorTests },
    { name: 'Unit: Secure Code Execution Sandbox', fn: runSandboxTests },
    { name: 'Unit: Hybrid Intelligence Model Router', fn: runModelRouterTests },
    { name: 'Unit: MCP Server & Tool Registry', fn: runMcpServerTests },
    { name: 'Unit: Repository Scanner & Path Safety (Phase 8)', fn: runRepositoryScannerTests },
    { name: 'Unit: Patch System, Diffs & Checkpoints (Phase 8)', fn: runPatchSystemTests },
    { name: 'Unit: Web Technologies Static Analysis & Linting (HTML, CSS, JS)', fn: runWebTechnologiesTests },
    { name: 'Unit: Continuous Quality Service & Health Gates (Phase 9)', fn: runContinuousQualityTests },
    { name: 'Unit: Prediction & Risk Engine (Phase 10)', fn: runPredictionRiskEngineTests },
    { name: 'Unit: MCP Prediction & Historical Telemetry Tools (Phase 10)', fn: runMcpPredictionToolsTests },
    { name: 'Integration: Single-Snippet E2E Pipeline (Stage 3 & 7)', fn: runE2ePipelineTests },
    { name: 'Integration: Failure Modes & Watchdog Timeouts', fn: runFailureModesTests },
    { name: 'Integration: Autonomous Repository Workflow (Stage 8)', fn: runRepositoryWorkflowIntegrationTests },
    { name: 'Integration: Predictive Workflow & Recommendation Decisions (Phase 10)', fn: runPredictiveWorkflowIntegrationTests },
  ];

  for (const suite of suites) {
    try {
      console.log(`\n• [Test Suite] ${suite.name}`);
      await suite.fn();
      passed++;
    } catch (err: any) {
      console.error(`  ✖ FAILED: ${err.message}`);
      failed++;
    }
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log('\n================================================================');
  console.log(`Test Execution Summary: ${passed} passed, ${failed} failed in ${duration}s`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
