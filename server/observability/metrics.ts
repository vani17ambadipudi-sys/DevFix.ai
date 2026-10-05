export interface MetricStats {
  count: number;
  totalDurationMs: number;
  minDurationMs: number;
  maxDurationMs: number;
  avgDurationMs: number;
}

export interface ErrorEvent {
  id: string;
  timestamp: string;
  requestId: string;
  errorCode: string;
  component: string;
  message: string;
}

class MetricsCollector {
  private startTime: number = Date.now();
  private totalRequests: number = 0;
  private successfulRequests: number = 0;
  private failedRequests: number = 0;

  // Latency maps
  private apiLatencies: number[] = [];
  private aiLatencies: number[] = [];
  private executionLatencies: number[] = [];

  // Agent Latencies: agentName -> durations[]
  private agentLatencies: Record<string, number[]> = {
    'Manager Agent': [],
    'Analyzer Agent': [],
    'Fixer Agent': [],
    'Tester Agent': [],
    'Reviewer Agent': [],
  };

  // MCP Tool Usage: toolName -> { count, success, error, durations[] }
  private mcpTools: Record<string, { count: number; success: number; error: number; durations: number[] }> = {
    run_code: { count: 0, success: 0, error: 0, durations: [] },
    read_project_file: { count: 0, success: 0, error: 0, durations: [] },
    inspect_project: { count: 0, success: 0, error: 0, durations: [] },
    search_documentation: { count: 0, success: 0, error: 0, durations: [] },
  };

  // Model Routing Usage counts
  private modelUsage: {
    gemini: number;
    localTransformer: number;
    staticFallback: number;
  } = {
    gemini: 0,
    localTransformer: 0,
    staticFallback: 0,
  };

  // Recent errors buffer
  private recentErrors: ErrorEvent[] = [];
  private maxErrors: number = 50;

  private computeStats(durations: number[]): MetricStats {
    if (durations.length === 0) {
      return { count: 0, totalDurationMs: 0, minDurationMs: 0, maxDurationMs: 0, avgDurationMs: 0 };
    }
    const total = durations.reduce((a, b) => a + b, 0);
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    return {
      count: durations.length,
      totalDurationMs: Math.round(total),
      minDurationMs: Math.round(min),
      maxDurationMs: Math.round(max),
      avgDurationMs: Math.round((total / durations.length) * 10) / 10,
    };
  }

  public recordApiRequest(durationMs: number, success: boolean) {
    this.totalRequests++;
    if (success) {
      this.successfulRequests++;
    } else {
      this.failedRequests++;
    }
    this.apiLatencies.push(durationMs);
    if (this.apiLatencies.length > 500) this.apiLatencies.shift();
  }

  public recordAiRequest(provider: 'gemini' | 'localTransformer' | 'staticFallback', durationMs: number) {
    this.modelUsage[provider] = (this.modelUsage[provider] || 0) + 1;
    this.aiLatencies.push(durationMs);
    if (this.aiLatencies.length > 200) this.aiLatencies.shift();
  }

  public recordAgentExecution(agentName: string, durationMs: number) {
    if (!this.agentLatencies[agentName]) {
      this.agentLatencies[agentName] = [];
    }
    this.agentLatencies[agentName].push(durationMs);
    if (this.agentLatencies[agentName].length > 100) this.agentLatencies[agentName].shift();
  }

  public recordMcpCall(toolName: string, durationMs: number, success: boolean) {
    if (!this.mcpTools[toolName]) {
      this.mcpTools[toolName] = { count: 0, success: 0, error: 0, durations: [] };
    }
    this.mcpTools[toolName].count++;
    if (success) {
      this.mcpTools[toolName].success++;
    } else {
      this.mcpTools[toolName].error++;
    }
    this.mcpTools[toolName].durations.push(durationMs);
    if (this.mcpTools[toolName].durations.length > 100) this.mcpTools[toolName].durations.shift();

    if (toolName === 'run_code') {
      this.executionLatencies.push(durationMs);
      if (this.executionLatencies.length > 100) this.executionLatencies.shift();
    }
  }

  public recordError(requestId: string, errorCode: string, component: string, message: string) {
    const errorEvent: ErrorEvent = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      requestId,
      errorCode,
      component,
      message,
    };
    this.recentErrors.unshift(errorEvent);
    if (this.recentErrors.length > this.maxErrors) {
      this.recentErrors.pop();
    }
  }

  public getSnapshot() {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const successRate =
      this.totalRequests > 0
        ? Math.round((this.successfulRequests / this.totalRequests) * 1000) / 10
        : 100;

    const agentStats: Record<string, MetricStats> = {};
    for (const [agent, list] of Object.entries(this.agentLatencies)) {
      agentStats[agent] = this.computeStats(list);
    }

    const mcpStats: Record<string, any> = {};
    for (const [tool, data] of Object.entries(this.mcpTools)) {
      mcpStats[tool] = {
        totalCalls: data.count,
        success: data.success,
        errors: data.error,
        ...this.computeStats(data.durations),
      };
    }

    return {
      systemStatus: {
        uptimeSeconds,
        serverStarted: new Date(this.startTime).toISOString(),
        totalRequests: this.totalRequests,
        successfulRequests: this.successfulRequests,
        failedRequests: this.failedRequests,
        successRatePercent: successRate,
      },
      latencies: {
        api: this.computeStats(this.apiLatencies),
        ai: this.computeStats(this.aiLatencies),
        execution: this.computeStats(this.executionLatencies),
      },
      agentExecution: agentStats,
      mcpUsage: mcpStats,
      modelUsage: this.modelUsage,
      recentErrors: this.recentErrors,
    };
  }

  public reset() {
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.apiLatencies = [];
    this.aiLatencies = [];
    this.executionLatencies = [];
    for (const key of Object.keys(this.agentLatencies)) {
      this.agentLatencies[key] = [];
    }
    for (const key of Object.keys(this.mcpTools)) {
      this.mcpTools[key] = { count: 0, success: 0, error: 0, durations: [] };
    }
    this.recentErrors = [];
  }
}

export const metrics = new MetricsCollector();
