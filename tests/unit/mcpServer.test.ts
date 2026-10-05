import assert from 'assert';
import { mcpServer } from '../../mcp-server/server';

export async function runMcpServerTests() {
  console.log('  ▶ Running MCPServer tests...');

  // Test 1: Tools inventory
  const tools = mcpServer.listTools();
  assert.strictEqual(tools.length >= 4, true, 'At least 4 MCP tools must be registered');
  const toolNames = tools.map((t) => t.name);
  assert.strictEqual(toolNames.includes('run_code'), true, 'run_code tool must exist');
  assert.strictEqual(toolNames.includes('search_documentation'), true, 'search_documentation tool must exist');
  assert.strictEqual(toolNames.includes('read_project_file'), true, 'read_project_file tool must exist');
  assert.strictEqual(toolNames.includes('inspect_project'), true, 'inspect_project tool must exist');

  // Test 2: Search documentation execution
  const docResult = await mcpServer.executeTool({
    tool: 'search_documentation',
    arguments: { query: 'list index', technology: 'Python' },
  });
  assert.strictEqual(docResult.success, true, 'search_documentation should succeed');
  assert.strictEqual(docResult.data.technology, 'Python', 'Documentation must match technology');

  // Test 3: Path traversal protection on read_project_file
  const badPathResult = await mcpServer.executeTool({
    tool: 'read_project_file',
    arguments: { path: '../../etc/passwd' },
  });
  assert.strictEqual(badPathResult.success, false, 'Path traversal must be rejected by tool');

  console.log('  ✔ MCPServer tests passed.');
}
