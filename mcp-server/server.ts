import {
  MCPActivityEvent,
  MCPToolDefinition,
  MCPToolRequest,
  MCPToolResponse,
} from './types';
import { executeRunCode, runCodeDefinition } from './tools/runCode';
import { executeReadProjectFile, readProjectFileDefinition } from './tools/readProjectFile';
import { executeInspectProject, inspectProjectDefinition } from './tools/inspectProject';
import {
  executeSearchDocumentation,
  searchDocumentationDefinition,
} from './tools/searchDocumentation';

// Phase 8: Repository Engineering Tools
import { executeSearchProject, searchProjectDefinition } from './tools/searchProject';
import { executeRunTests, runTestsDefinition } from './tools/runTests';
import { executeApplyPatch, applyPatchDefinition } from './tools/applyPatch';
import { executeGenerateDiff, generateDiffDefinition } from './tools/generateDiff';
import { executeGitStatus, gitStatusDefinition } from './tools/gitStatus';
import { executeGitDiff, gitDiffDefinition } from './tools/gitDiff';

// Phase 10: Predictive Maintenance & Historical Telemetry Tools
import { executeGetRepositoryHistory, getRepositoryHistoryDefinition } from './tools/getRepositoryHistory';
import { executeGetTestHistory, getTestHistoryDefinition } from './tools/getTestHistory';
import { executeGetBuildHistory, getBuildHistoryDefinition } from './tools/getBuildHistory';
import { executeGetSecurityHistory, getSecurityHistoryDefinition } from './tools/getSecurityHistory';
import { executeGetDependencyHistory, getDependencyHistoryDefinition } from './tools/getDependencyHistory';
import { executeGetPerformanceHistory, getPerformanceHistoryDefinition } from './tools/getPerformanceHistory';
import { executeGetChangeHotspots, getChangeHotspotsDefinition } from './tools/getChangeHotspots';
import { executeGetMaintenanceHistory, getMaintenanceHistoryDefinition } from './tools/getMaintenanceHistory';

class DevFixMCPServer {
  private tools: Map<string, { definition: MCPToolDefinition; handler: (args: any) => Promise<any> }> =
    new Map();
  private activityLog: MCPActivityEvent[] = [];
  private readonly maxActivityEntries = 150;

  constructor() {
    // Stage 4 Tools
    this.registerTool(runCodeDefinition, executeRunCode);
    this.registerTool(readProjectFileDefinition, executeReadProjectFile);
    this.registerTool(inspectProjectDefinition, executeInspectProject);
    this.registerTool(searchDocumentationDefinition, executeSearchDocumentation);

    // Stage 8 Autonomous Repository Tools
    this.registerTool(searchProjectDefinition, executeSearchProject);
    this.registerTool(runTestsDefinition, executeRunTests);
    this.registerTool(applyPatchDefinition, executeApplyPatch);
    this.registerTool(generateDiffDefinition, executeGenerateDiff);
    this.registerTool(gitStatusDefinition, executeGitStatus);
    this.registerTool(gitDiffDefinition, executeGitDiff);

    // Stage 10 Predictive Software Engineering Tools
    this.registerTool(getRepositoryHistoryDefinition, executeGetRepositoryHistory);
    this.registerTool(getTestHistoryDefinition, executeGetTestHistory);
    this.registerTool(getBuildHistoryDefinition, executeGetBuildHistory);
    this.registerTool(getSecurityHistoryDefinition, executeGetSecurityHistory);
    this.registerTool(getDependencyHistoryDefinition, executeGetDependencyHistory);
    this.registerTool(getPerformanceHistoryDefinition, executeGetPerformanceHistory);
    this.registerTool(getChangeHotspotsDefinition, executeGetChangeHotspots);
    this.registerTool(getMaintenanceHistoryDefinition, executeGetMaintenanceHistory);

    // Initial system boot activity
    this.recordActivity({
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      requesterAgent: 'System',
      tool: 'server',
      action: 'completed',
      message: 'DevFix MCP Server initialized with 18 registered tools (Stage 4, 8, & 10).',
    });
  }

  public registerTool(definition: MCPToolDefinition, handler: (args: any) => Promise<any>) {
    this.tools.set(definition.name, { definition, handler });
  }

  public listTools(): MCPToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  public hasTool(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  public async executeTool(request: MCPToolRequest): Promise<MCPToolResponse> {
    const { tool, arguments: args, requesterAgent = 'UnknownAgent' } = request;
    const startTime = performance.now();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Step 1: Record request received
    this.recordActivity({
      id: crypto.randomUUID(),
      timestamp: timeStr,
      requesterAgent,
      tool,
      action: 'requested',
      message: `${requesterAgent} requested ${tool}`,
      details: JSON.stringify(args).slice(0, 120),
    });

    const target = this.tools.get(tool);
    if (!target) {
      const errMessage = `MCP Tool Error: Tool "${tool}" is not registered on this server.`;
      this.recordActivity({
        id: crypto.randomUUID(),
        timestamp: timeStr,
        requesterAgent,
        tool,
        action: 'failed',
        message: errMessage,
      });
      return {
        success: false,
        tool,
        error: errMessage,
        executionTimeMs: Math.round(performance.now() - startTime),
      };
    }

    try {
      const result = await target.handler(args || {});
      const durationMs = Math.round(performance.now() - startTime);
      const finishTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Step 2: Record completion
      this.recordActivity({
        id: crypto.randomUUID(),
        timestamp: finishTimeStr,
        requesterAgent,
        tool,
        action: 'completed',
        message: `${tool} completed in ${durationMs}ms`,
        details: typeof result === 'object' && 'exitCode' in result
          ? `exitCode: ${result.exitCode}, success: ${result.success}`
          : 'Operation succeeded',
        durationMs,
      });

      return {
        success: true,
        tool,
        data: result,
        executionTimeMs: durationMs,
      };
    } catch (error: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const finishTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const errMsg = error?.message || String(error);

      this.recordActivity({
        id: crypto.randomUUID(),
        timestamp: finishTimeStr,
        requesterAgent,
        tool,
        action: 'failed',
        message: `${tool} execution failed: ${errMsg}`,
        durationMs,
      });

      return {
        success: false,
        tool,
        error: errMsg,
        executionTimeMs: durationMs,
      };
    }
  }

  public getActivityLog(): MCPActivityEvent[] {
    return [...this.activityLog];
  }

  public recordActivity(event: MCPActivityEvent) {
    this.activityLog.unshift(event);
    if (this.activityLog.length > this.maxActivityEntries) {
      this.activityLog.pop();
    }
  }

  public clearActivityLog() {
    this.activityLog = [];
  }
}

export const mcpServer = new DevFixMCPServer();
