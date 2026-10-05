import { logger } from './logger';
import { metrics } from './metrics';

export interface TraceStep {
  stage: string;
  component: string;
  startTime: number;
  endTime?: number;
  durationMs?: number;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  summary?: string;
  details?: Record<string, any>;
}

export interface RequestTrace {
  requestId: string;
  userId?: string;
  operation: string;
  startTime: number;
  endTime?: number;
  totalDurationMs?: number;
  overallStatus: 'running' | 'success' | 'error';
  modelRouted?: string;
  steps: TraceStep[];
  error?: string;
}

const activeTraces = new Map<string, RequestTrace>();
const completedTraces: RequestTrace[] = [];
const MAX_COMPLETED_TRACES = 50;

export const tracer = {
  startTrace(requestId: string, operation: string, userId?: string): RequestTrace {
    const trace: RequestTrace = {
      requestId,
      userId,
      operation,
      startTime: Date.now(),
      overallStatus: 'running',
      steps: [],
    };
    activeTraces.set(requestId, trace);
    logger.info(`Starting trace: ${operation}`, requestId, { userId });
    return trace;
  },

  stepStart(requestId: string, stage: string, component: string, summary?: string): number {
    const trace = activeTraces.get(requestId);
    const now = Date.now();
    if (trace) {
      trace.steps.push({
        stage,
        component,
        startTime: now,
        status: 'pending',
        summary,
      });
    }
    return now;
  },

  stepEnd(
    requestId: string,
    stage: string,
    status: 'success' | 'failed' | 'skipped' = 'success',
    summary?: string,
    details?: Record<string, any>
  ) {
    const trace = activeTraces.get(requestId);
    const now = Date.now();
    if (trace) {
      const step = trace.steps.slice().reverse().find((s) => s.stage === stage && s.status === 'pending');
      if (step) {
        step.endTime = now;
        step.durationMs = now - step.startTime;
        step.status = status;
        if (summary) step.summary = summary;
        if (details) step.details = details;

        // Log agent and mcp metrics
        if (step.component.includes('Agent')) {
          metrics.recordAgentExecution(step.component, step.durationMs);
        } else if (stage.includes('MCP') && details?.toolName) {
          metrics.recordMcpCall(details.toolName, step.durationMs, status === 'success');
        }
      }
    }
  },

  finishTrace(requestId: string, overallStatus: 'success' | 'error' = 'success', modelRouted?: string, errorMsg?: string): RequestTrace | undefined {
    const trace = activeTraces.get(requestId);
    if (!trace) return undefined;

    const now = Date.now();
    trace.endTime = now;
    trace.totalDurationMs = now - trace.startTime;
    trace.overallStatus = overallStatus;
    if (modelRouted) trace.modelRouted = modelRouted;
    if (errorMsg) trace.error = errorMsg;

    activeTraces.delete(requestId);
    completedTraces.unshift(trace);
    if (completedTraces.length > MAX_COMPLETED_TRACES) {
      completedTraces.pop();
    }

    metrics.recordApiRequest(trace.totalDurationMs, overallStatus === 'success');
    logger.log({
      operation: trace.operation,
      requestId,
      status: overallStatus === 'success' ? 'success' : 'error',
      durationMs: trace.totalDurationMs,
      errorCode: errorMsg ? 'REQUEST_FAILED' : undefined,
      message: errorMsg,
      metadata: {
        stepsCount: trace.steps.length,
        modelRouted,
      },
    });

    return trace;
  },

  getTrace(requestId: string): RequestTrace | undefined {
    return activeTraces.get(requestId) || completedTraces.find((t) => t.requestId === requestId);
  },

  getRecentTraces(limit: number = 20): RequestTrace[] {
    return completedTraces.slice(0, limit);
  },
};
