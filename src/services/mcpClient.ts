import type {
  MCPActivityEvent,
  MCPToolDefinition,
  MCPToolRequest,
  MCPToolResponse,
  RunCodeArgs,
  RunCodeResult,
  ReadProjectFileArgs,
  ReadProjectFileResult,
  InspectProjectArgs,
  InspectProjectResult,
  SearchDocumentationArgs,
  SearchDocumentationResult,
} from '../../mcp-server/types';

export interface IMCPServerProvider {
  executeTool(request: MCPToolRequest): Promise<MCPToolResponse>;
  listTools(): MCPToolDefinition[];
  getActivityLog(): MCPActivityEvent[];
}

export class DevFixMCPClient {
  private serverProvider: IMCPServerProvider | null = null;
  private clientActivityLog: MCPActivityEvent[] = [];
  private onActivityListeners: ((event: MCPActivityEvent) => void)[] = [];

  constructor() {
    // Initial client-side activity entry
    this.recordLocalActivity({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'init-mcp',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      requesterAgent: 'MCPClient',
      tool: 'connection',
      action: 'completed',
      message: 'MCP Client connected to DevFix MCP Server.',
    });
  }

  /**
   * Used on the server-side (Node.js) in server.ts to bind the in-memory MCP Server instance.
   * In the browser, this remains null, and the client communicates over HTTP.
   */
  public setServerProvider(provider: IMCPServerProvider) {
    this.serverProvider = provider;
  }

  public subscribeToActivity(listener: (event: MCPActivityEvent) => void): () => void {
    this.onActivityListeners.push(listener);
    return () => {
      this.onActivityListeners = this.onActivityListeners.filter((l) => l !== listener);
    };
  }

  private recordLocalActivity(event: MCPActivityEvent) {
    this.clientActivityLog.unshift(event);
    if (this.clientActivityLog.length > 50) {
      this.clientActivityLog.pop();
    }
    this.onActivityListeners.forEach((fn) => fn(event));
  }

  public async listTools(): Promise<{
    status: 'Connected' | 'Disconnected';
    tools: MCPToolDefinition[];
    serverVersion: string;
  }> {
    if (this.serverProvider) {
      return {
        status: 'Connected',
        tools: this.serverProvider.listTools(),
        serverVersion: '1.0.0-mcp',
      };
    }

    try {
      const res = await fetch('/api/mcp/tools');
      if (res.ok) {
        const data = await res.json();
        return {
          status: 'Connected',
          tools: data.tools || [],
          serverVersion: data.serverVersion || '1.0.0-mcp',
        };
      }
    } catch {
      // fallback
    }

    return {
      status: 'Connected',
      tools: [
        {
          name: 'run_code',
          description: 'Safely execute supported source code (Python, JS, TS) in an isolated sandbox subprocess.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'read_project_file',
          description: 'Read permitted project source files with strict path protection.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'inspect_project',
          description: 'Provide a safe summary of the project structure and permitted source files.',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'search_documentation',
          description: 'Search approved official programming and debugging documentation across 9 languages.',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
      serverVersion: '1.0.0-mcp',
    };
  }

  public async callTool<T = any>(
    toolName: string,
    args: Record<string, unknown>,
    requesterAgent: string = 'Agent'
  ): Promise<MCPToolResponse<T>> {
    const request: MCPToolRequest = {
      tool: toolName,
      arguments: args,
      requesterAgent,
    };

    // If server provider is directly attached (Node.js runtime in server.ts)
    if (this.serverProvider) {
      const response = await this.serverProvider.executeTool(request);
      const recent = this.serverProvider.getActivityLog()[0];
      if (recent) {
        this.recordLocalActivity(recent);
      }
      return response;
    }

    // Browser runtime: send over HTTP to MCP Server API endpoint
    const startTime = performance.now();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    this.recordLocalActivity({
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      timestamp: timeStr,
      requesterAgent,
      tool: toolName,
      action: 'requested',
      message: `${requesterAgent} requested ${toolName}`,
      details: JSON.stringify(args).slice(0, 120),
    });

    try {
      const res = await fetch('/api/mcp/call', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const durationMs = Math.round(performance.now() - startTime);
      const finishTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      if (!res.ok) {
        let errText = `Server responded with ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson.error) errText = errJson.error;
        } catch {
          // ignore
        }

        const failEvent: MCPActivityEvent = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
          timestamp: finishTimeStr,
          requesterAgent,
          tool: toolName,
          action: 'failed',
          message: `${toolName} execution failed: ${errText}`,
          durationMs,
        };
        this.recordLocalActivity(failEvent);

        return {
          success: false,
          tool: toolName,
          error: errText,
          executionTimeMs: durationMs,
        };
      }

      const data: MCPToolResponse<T> = await res.json();

      const completeEvent: MCPActivityEvent = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        timestamp: finishTimeStr,
        requesterAgent,
        tool: toolName,
        action: data.success ? 'completed' : 'failed',
        message: data.success
          ? `${toolName} completed in ${data.executionTimeMs || durationMs}ms`
          : `${toolName} failed: ${data.error}`,
        durationMs: data.executionTimeMs || durationMs,
      };
      this.recordLocalActivity(completeEvent);

      return data;
    } catch (err: any) {
      const durationMs = Math.round(performance.now() - startTime);
      const finishTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const errMsg = err?.message || 'Network request failed';

      this.recordLocalActivity({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        timestamp: finishTimeStr,
        requesterAgent,
        tool: toolName,
        action: 'failed',
        message: `${toolName} execution failed: ${errMsg}`,
        durationMs,
      });

      return {
        success: false,
        tool: toolName,
        error: errMsg,
        executionTimeMs: durationMs,
      };
    }
  }

  // Typed convenience helper for Tester Agent
  public async runCode(
    args: RunCodeArgs,
    requesterAgent: string = 'Tester'
  ): Promise<RunCodeResult> {
    const response = await this.callTool<RunCodeResult>('run_code', args as any, requesterAgent);
    if (!response.success || !response.data) {
      return {
        attempted: true,
        success: false,
        stdout: '',
        stderr: response.error || 'MCP execution failed',
        exitCode: 1,
        executionTime: response.executionTimeMs,
        reason: response.error,
      };
    }
    return response.data;
  }

  // Typed convenience helper for Analyzer / Reviewer
  public async readProjectFile(
    args: ReadProjectFileArgs,
    requesterAgent: string = 'Analyzer'
  ): Promise<ReadProjectFileResult> {
    const response = await this.callTool<ReadProjectFileResult>(
      'read_project_file',
      args as any,
      requesterAgent
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to read project file through MCP');
    }
    return response.data;
  }

  // Typed convenience helper for Project Inspector
  public async inspectProject(
    args: InspectProjectArgs = {},
    requesterAgent: string = 'Analyzer'
  ): Promise<InspectProjectResult> {
    const response = await this.callTool<InspectProjectResult>(
      'inspect_project',
      args as any,
      requesterAgent
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to inspect project through MCP');
    }
    return response.data;
  }

  // Typed convenience helper for Documentation Search
  public async searchDocumentation(
    args: SearchDocumentationArgs,
    requesterAgent: string = 'Fixer'
  ): Promise<SearchDocumentationResult> {
    const response = await this.callTool<SearchDocumentationResult>(
      'search_documentation',
      args as any,
      requesterAgent
    );
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to search documentation through MCP');
    }
    return response.data;
  }

  public getActivityLog(): MCPActivityEvent[] {
    if (this.serverProvider) {
      return this.serverProvider.getActivityLog();
    }
    return [...this.clientActivityLog];
  }

  public async fetchActivityLog(): Promise<MCPActivityEvent[]> {
    if (this.serverProvider) {
      return this.serverProvider.getActivityLog();
    }
    try {
      const res = await fetch('/api/mcp/activity');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.activity)) {
          this.clientActivityLog = data.activity;
          return data.activity;
        }
      }
    } catch {
      // fallback
    }
    return [...this.clientActivityLog];
  }
}

export const mcpClient = new DevFixMCPClient();
