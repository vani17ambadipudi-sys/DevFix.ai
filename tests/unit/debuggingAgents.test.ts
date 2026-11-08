import assert from 'assert';
import {
  PipelineAnalysisAgent,
  AgentCommunicationAgent,
  OrchestratorDebuggingAgent,
  IntegrationApiAgent,
  ErrorHandlingAgent,
  TestingValidationAgent,
  runCompletePipelineAudit,
} from '../../src/agents/debugging/debuggingAgents';

export async function runDebuggingAgentsTests(): Promise<void> {
  console.log('  ▶ Running Specialized Debugging Agents tests (Agents 1-6)...');

  // 1. Agent 1: Pipeline Analysis Agent
  const pipelineReport = PipelineAnalysisAgent.auditPipeline('test_exec_pipeline');
  assert.strictEqual(pipelineReport.overallHealth, 'healthy', 'Pipeline analysis should report healthy architecture');
  assert.strictEqual(pipelineReport.brokenStagesCount, 0, 'Pipeline should have 0 broken stages');
  assert.ok(pipelineReport.stages.length >= 8, 'Pipeline must comprise at least 8 verified stages');
  assert.strictEqual(pipelineReport.sequenceIntegrity, true, 'Execution sequence must be valid');
  assert.strictEqual(pipelineReport.missingConnections.length, 0, 'No missing connections allowed');

  const entryStage = pipelineReport.stages.find((s) => s.id === 'stage_1_entry');
  assert.ok(entryStage && entryStage.status === 'valid', 'Entry stage must be present and valid');

  const testerStage = pipelineReport.stages.find((s) => s.id === 'stage_6_tester');
  assert.ok(testerStage && testerStage.status === 'valid', 'Tester stage must be present and valid');

  // 2. Agent 2: Agent Communication Agent
  // Test valid handoff from Analyzer to Fixer
  const validAnalyzerToFixer = AgentCommunicationAgent.verifyMessagePassing('Analyzer', 'Fixer', {
    status: 'error_found',
    summary: 'Detected loop off-by-one',
    errorTypes: ['IndexError'],
    problems: [{ title: 'List index out of range', severity: 'high' }],
    recommendations: ['Fix range limit'],
  });
  assert.strictEqual(validAnalyzerToFixer.valid, true, 'Valid Analyzer->Fixer message passing must pass');
  assert.strictEqual(validAnalyzerToFixer.errors.length, 0, 'Valid message passing should have 0 errors');

  // Test invalid handoff from Fixer to Tester (empty code)
  const invalidFixerToTester = AgentCommunicationAgent.verifyMessagePassing('Fixer', 'Tester', {
    correctedCode: '',
    changes: [],
  });
  assert.strictEqual(invalidFixerToTester.valid, false, 'Invalid message passing with empty code must fail');
  assert.ok(invalidFixerToTester.errors.length > 0, 'Expected errors on empty correctedCode');

  // Test timeline audit
  const timelineAudit = AgentCommunicationAgent.auditTimelineCommunication([
    { id: '1', agent: 'Manager', status: 'Completed', timestamp: '12:00:00' },
    { id: '2', agent: 'Analyzer', status: 'Completed', timestamp: '12:00:01' },
    { id: '3', agent: 'Fixer', status: 'Completed', timestamp: '12:00:02' },
    { id: '4', agent: 'Tester', status: 'Completed', timestamp: '12:00:03' },
    { id: '5', agent: 'Reviewer', status: 'Completed', timestamp: '12:00:04' },
  ]);
  assert.strictEqual(timelineAudit.valid, true, 'Timeline communication audit must pass when all 5 agents are present');

  // 3. Agent 3: Orchestrator Debugging Agent
  const orchAudit = OrchestratorDebuggingAgent.verifyRouting('print("test")', 'Python');
  assert.ok(orchAudit.selectedRoute, 'Orchestrator must assign a valid route decision');
  assert.strictEqual(orchAudit.maxCyclesEnforced, 3, 'Max cycles must be bounded at 3');

  const cycleValid = OrchestratorDebuggingAgent.auditCycleExecution(2, 3);
  assert.strictEqual(cycleValid.withinBounds, true, 'Cycle 2 must be within bounds (max 3)');

  const cycleOverflow = OrchestratorDebuggingAgent.auditCycleExecution(4, 3);
  assert.strictEqual(cycleOverflow.withinBounds, false, 'Cycle 4 must be flagged as out-of-bounds');

  // 4. Agent 4: Integration & API Agent
  const integrationAudit = IntegrationApiAgent.checkIntegrations('test_exec_integ');
  assert.strictEqual(integrationAudit.databaseHealthy, true, 'Database integration must report healthy');
  assert.strictEqual(integrationAudit.mcpServerConnected, true, 'MCP Server must report connected');
  assert.ok(integrationAudit.mcpToolsCount >= 3, 'MCP Server must expose at least 3 tools');
  assert.strictEqual(integrationAudit.retryPolicyConfigured, true, 'Retry policy must be configured');
  assert.strictEqual(integrationAudit.fallbackModel, 'gemini-3.1-flash-lite', 'Secondary fallback model must be configured');

  // 5. Agent 5: Error Handling Agent
  // Test high demand error detection
  const highDemandErr = new Error('This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later');
  assert.strictEqual(ErrorHandlingAgent.isTransientError(highDemandErr), true, 'High demand error must be identified as transient');

  const unavailable503 = new Error('503 Service Unavailable');
  assert.strictEqual(ErrorHandlingAgent.isTransientError(unavailable503), true, '503 error must be identified as transient');

  const rateLimit429 = new Error('429 Resource has been exhausted');
  assert.strictEqual(ErrorHandlingAgent.isTransientError(rateLimit429), true, '429 error must be identified as transient');

  const normalSyntaxErr = new Error('Invalid token at line 3');
  assert.strictEqual(ErrorHandlingAgent.isTransientError(normalSyntaxErr), false, 'Syntax error must not be transient');

  // Test agent exception handling and recovery
  const recovered = ErrorHandlingAgent.handleAgentException(
    'Analyzer',
    highDemandErr,
    { status: 'error_found', summary: 'Deterministic fallback summary' }
  );
  assert.strictEqual(recovered.recovered, true, 'Exception handler must report recovered');
  assert.strictEqual(recovered.structuredResponse.status, 'error_found', 'Structured fallback response must be returned');

  // 6. Agent 6: Testing & Validation Agent
  const autonomousValidation = await TestingValidationAgent.runAutonomousValidation({
    language: 'Python',
    code: 'def sum_items(items):\n    s = 0\n    for i in range(len(items) + 1):\n        s += items[i]\n    return s',
  });
  assert.strictEqual(autonomousValidation.allPassed, true, 'All autonomous validation tests must pass');
  assert.ok(autonomousValidation.totalTests >= 5, 'Must run at least 5 validation checks');

  // 7. Complete Pipeline Audit Runner
  const auditSummary = await runCompletePipelineAudit('test_full_audit');
  assert.strictEqual(auditSummary.overallStatus, 'all_passed', 'Complete pipeline audit overall status must be all_passed');
  assert.ok(auditSummary.agents.pipelineAnalysis.stages.length >= 8, 'Pipeline analysis stages must be complete');
  assert.strictEqual(auditSummary.agents.agentCommunication.valid, true, 'Agent communication must be valid');
  assert.strictEqual(auditSummary.agents.testingValidation.allPassed, true, 'Testing validation must be all passed');

  console.log('  ✔ All Specialized Debugging Agents unit tests passed.');
}
