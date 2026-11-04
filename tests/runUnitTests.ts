import { runValidatorTests } from './unit/validator.test';
import { runSandboxTests } from './unit/sandbox.test';
import { runModelRouterTests } from './unit/modelRouter.test';
import { runMcpServerTests } from './unit/mcpServer.test';
import { runRepositoryScannerTests } from './unit/repositoryScanner.test';
import { runPatchSystemTests } from './unit/patchSystem.test';
import { runWebTechnologiesTests } from './unit/webTechnologies.test';
import { runContinuousQualityTests } from './unit/qualityService.test';
import { runPredictionRiskEngineTests } from './unit/predictionRiskEngine.test';
import { runMcpPredictionToolsTests } from './unit/mcpPredictionTools.test';
import { runCicdPipelineTests } from './unit/cicdPipeline.test';

async function main() {
  console.log('================================================================');
  console.log('DevFix AI — Unit Test Suite (Stages 1 through 10 & CI/CD Pipeline)');
  console.log('================================================================');

  const start = Date.now();
  let passed = 0;
  let failed = 0;

  const unitSuites: Array<{ name: string; fn: () => Promise<void> }> = [
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
    { name: 'Unit: CI/CD Pipeline & Live Health Gate Integrity', fn: runCicdPipelineTests },
  ];

  for (const suite of unitSuites) {
    try {
      console.log(`\n• [Unit Suite] ${suite.name}`);
      await suite.fn();
      passed++;
    } catch (err: any) {
      console.error(`  ✖ FAILED: ${err.message}`);
      failed++;
    }
  }

  const duration = ((Date.now() - start) / 1000).toFixed(2);
  console.log('\n================================================================');
  console.log(`Unit Test Execution Summary: ${passed} passed, ${failed} failed in ${duration}s`);
  console.log('================================================================');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Unit test runner fatal error:', err);
  process.exit(1);
});
