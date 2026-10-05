import assert from 'assert';
import { mcpServer } from '../../mcp-server/server';

export async function runMcpPredictionToolsTests() {
  console.log('  ▶ Running MCP Prediction Tools Unit Tests (Phase 10)...');

  // Test 1: Verify all 18 tools are registered
  const tools = mcpServer.listTools();
  assert.strictEqual(tools.length, 18, 'MCP Server must have exactly 18 tools registered');

  const expectedPhase10Tools = [
    'get_repository_history',
    'get_test_history',
    'get_build_history',
    'get_security_history',
    'get_dependency_history',
    'get_performance_history',
    'get_change_hotspots',
    'get_maintenance_history',
  ];

  for (const toolName of expectedPhase10Tools) {
    const found = tools.some((t) => t.name === toolName);
    assert(found, `Tool ${toolName} must be registered in MCP server`);
  }

  // Test 2: Execute get_test_history
  const testHistRes = await mcpServer.executeTool({
    tool: 'get_test_history',
    arguments: { repositoryId: 'repo_demo_01', days: 30, module: 'src/payments' },
  });
  assert.strictEqual(testHistRes.success, true, 'get_test_history must succeed');
  assert(testHistRes.data.totalRuns > 0, 'Must return test runs for payments');
  assert(testHistRes.data.failureCount >= 8, 'Must record payments test failures');

  // Test 3: Execute get_change_hotspots
  const hotspotRes = await mcpServer.executeTool({
    tool: 'get_change_hotspots',
    arguments: { repositoryId: 'repo_demo_01' },
  });
  assert.strictEqual(hotspotRes.success, true, 'get_change_hotspots must succeed');
  assert(hotspotRes.data.hotspots.length >= 2, 'Must return repository hotspots');
  const payHotspot = hotspotRes.data.hotspots.find((h: any) => h.path === 'src/payments');
  assert(payHotspot, 'Payments hotspot must be present');
  assert.strictEqual(payHotspot.changesCount, 5, 'Payments must have 5 changes recorded');

  // Test 4: Execute get_security_history
  const secRes = await mcpServer.executeTool({
    tool: 'get_security_history',
    arguments: { repositoryId: 'repo_demo_01', days: 60 },
  });
  assert.strictEqual(secRes.success, true, 'get_security_history must succeed');
  assert(secRes.data.records.length > 0, 'Security records must be returned');

  // Test 5: Execute get_repository_history aggregate
  const repoHistRes = await mcpServer.executeTool({
    tool: 'get_repository_history',
    arguments: { repositoryId: 'repo_demo_01', days: 30 },
  });
  assert.strictEqual(repoHistRes.success, true, 'get_repository_history must succeed');
  assert(repoHistRes.data.summary.totalTestRuns > 0, 'Aggregate test runs must be present');
  assert(repoHistRes.data.summary.hotspotCount > 0, 'Hotspots must be present');

  console.log('  ✔ MCP Prediction Tools Unit Tests passed.');
}
