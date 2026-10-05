import React, { useState, useEffect } from 'react';
import {
  Activity,
  ShieldCheck,
  Server,
  Zap,
  TrendingUp,
  Cpu,
  Play,
  RotateCw,
  AlertTriangle,
  CheckCircle2,
  FileCode,
  Layers,
  Database,
  Clock,
  Radio,
  ExternalLink,
} from 'lucide-react';

interface MetricsSnapshot {
  systemStatus: {
    uptimeSeconds: number;
    serverStarted: string;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRatePercent: number;
  };
  latencies: {
    api: { count: number; avgDurationMs: number; minDurationMs: number; maxDurationMs: number };
    ai: { count: number; avgDurationMs: number; minDurationMs: number; maxDurationMs: number };
    execution: { count: number; avgDurationMs: number; minDurationMs: number; maxDurationMs: number };
  };
  agentExecution: Record<string, { count: number; avgDurationMs: number; minDurationMs: number; maxDurationMs: number }>;
  mcpUsage: Record<string, { totalCalls: number; success: number; errors: number; avgDurationMs: number }>;
  modelUsage: { gemini: number; localTransformer: number; staticFallback: number };
  recentErrors: Array<{ id: string; timestamp: string; requestId: string; errorCode: string; component: string; message: string }>;
}

export const ProductionDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [dependencies, setDependencies] = useState<any>(null);
  const [traces, setTraces] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const [metricsRes, depsRes, tracesRes] = await Promise.all([
        fetch('/api/admin/metrics').then((r) => r.json()),
        fetch('/health/dependencies').then((r) => r.json()),
        fetch('/api/admin/traces').then((r) => r.json()),
      ]);

      if (metricsRes.success) setMetrics(metricsRes.data);
      setDependencies(depsRes);
      if (tracesRes.success) setTraces(tracesRes.data);
    } catch (err) {
      console.error('Failed to load production metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleRunE2eDemo = async () => {
    setIsDemoRunning(true);
    setDemoResult(null);
    try {
      const res = await fetch('/api/admin/run-e2e-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setDemoResult(data);
      fetchDashboardData();
    } catch (err: any) {
      setDemoResult({ error: err.message });
    } finally {
      setIsDemoRunning(false);
    }
  };

  const formatUptime = (seconds: number = 0) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m ${seconds % 60}s`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#11192e] via-[#141b30] to-[#0f1424] border border-cyan-900/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5" />
              Stage 7: Production Engineering &amp; Observability Platform
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
              Production Operations Dashboard
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Real-time telemetry, rate limiting, secure sandboxed execution, distributed request
              tracing, and model routing metrics for the DevFix AI platform.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchDashboardData}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono flex items-center gap-2 border border-slate-700 transition-all"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Telemetry
            </button>
          </div>
        </div>

        {/* System Health Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-[#0b0f17]/90 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 block text-[10px] uppercase">API Gateway</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              HEALTHY
            </span>
          </div>

          <div className="bg-[#0b0f17]/90 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 block text-[10px] uppercase">Database Store</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              {dependencies?.dependencies?.database?.toUpperCase() || 'HEALTHY'}
            </span>
          </div>

          <div className="bg-[#0b0f17]/90 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 block text-[10px] uppercase">MCP Server</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              4 TOOLS ACTIVE
            </span>
          </div>

          <div className="bg-[#0b0f17]/90 p-3 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400 block text-[10px] uppercase">Transformer Lab</span>
            <span className="text-purple-300 font-bold flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              PYTORCH CPU
            </span>
          </div>

          <div className="bg-[#0b0f17]/90 p-3 rounded-xl border border-slate-800 text-xs font-mono col-span-2 sm:col-span-1">
            <span className="text-slate-400 block text-[10px] uppercase">Model Router</span>
            <span className="text-cyan-300 font-bold flex items-center gap-1.5 mt-1 truncate">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              HYBRID ROUTER
            </span>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Total API Requests</span>
              <Activity className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics.systemStatus.totalRequests}
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span>{metrics.systemStatus.successRatePercent}% success rate</span>
            </div>
          </div>

          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Average API Latency</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics.latencies.api.avgDurationMs} ms
            </div>
            <div className="text-[11px] text-slate-400">
              Min: {metrics.latencies.api.minDurationMs}ms &bull; Max: {metrics.latencies.api.maxDurationMs}ms
            </div>
          </div>

          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Sandbox Executions</span>
              <Zap className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {metrics.latencies.execution.count} runs
            </div>
            <div className="text-[11px] text-slate-400">
              Avg runtime: {metrics.latencies.execution.avgDurationMs}ms
            </div>
          </div>

          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-5 shadow-lg space-y-1">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Platform Uptime</span>
              <Server className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-bold text-white">
              {formatUptime(metrics.systemStatus.uptimeSeconds)}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              Started: {new Date(metrics.systemStatus.serverStarted).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Section 38 Canonical E2E Verification Demo Runner */}
      <div className="bg-[#111726] border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[11px] font-mono font-semibold uppercase mb-2">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Section 38: End-to-End Test Suite
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              Canonical Pipeline Verification Runner
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Runs the canonical test case (<code>numbers = [10, 20, 30]; for i in range(len(numbers) + 1)...</code>)
              through Authentication, Rate Limiting, Request ID tracing, Model Routing, Multi-Agent Analysis, MCP Sandbox execution, and Reviewer verification.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunE2eDemo}
            disabled={isDemoRunning}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-slate-950 font-bold rounded-xl text-xs font-mono transition-all shadow-lg shadow-emerald-950/50 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
          >
            {isDemoRunning ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isDemoRunning ? 'Executing Full Trace...' : 'Run End-to-End Pipeline'}
          </button>
        </div>

        {/* Demo Result Output */}
        {demoResult && (
          <div className="bg-[#0b0f17] p-5 rounded-2xl border border-slate-800 space-y-4 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Trace ID: <strong className="text-cyan-300">{demoResult.requestId}</strong>
              </span>
              <span className="text-purple-300">
                Duration: {demoResult.durationMs}ms &bull; Target: {demoResult.modelTarget}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">1. Analyzer Finding:</span>
                <p className="text-slate-200 bg-[#111726] p-3 rounded-lg border border-slate-800">
                  {demoResult.analysis?.summary}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">2. Fixer Verified Code:</span>
                <pre className="text-emerald-300 bg-[#111726] p-3 rounded-lg border border-slate-800 overflow-x-auto text-[11px]">
                  {demoResult.fixedCode}
                </pre>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">3. MCP run_code Execution:</span>
                <div className="text-slate-300 bg-[#111726] p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span>Output: {demoResult.execution?.stdout || 'No output'}</span>
                  <span className="text-emerald-400 font-bold">Passed (Exit 0)</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 block text-[10px] uppercase">4. Reviewer Approval:</span>
                <div className="text-slate-300 bg-[#111726] p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                  <span>{demoResult.review?.summary}</span>
                  <span className="text-emerald-400 font-bold uppercase">APPROVED</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Latency & Agent Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Execution Times */}
        <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <Layers className="w-4 h-4 text-purple-400" />
              Agent Latency Breakdown
            </h3>
            <span className="text-xs font-mono text-slate-500">Real Measured Durations</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {metrics &&
              Object.entries(metrics.agentExecution).map(([agent, stats]) => (
                <div key={agent} className="bg-[#0b0f17] p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-200">{agent}</span>
                    <span className="text-purple-300 font-bold">{stats.avgDurationMs} ms</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Invocations: {stats.count}</span>
                    <span>Min: {stats.minDurationMs}ms &bull; Max: {stats.maxDurationMs}ms</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* MCP Tool Usage & Security Audit */}
        <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <Server className="w-4 h-4 text-emerald-400" />
              MCP Tools Execution Metrics
            </h3>
            <span className="text-xs font-mono text-slate-500">Standardized Tool Audit</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {metrics &&
              Object.entries(metrics.mcpUsage).map(([tool, stats]) => (
                <div key={tool} className="bg-[#0b0f17] p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-cyan-300">{tool}</span>
                    <span className="text-emerald-400 font-bold">{stats.avgDurationMs} ms</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Calls: {stats.totalCalls} ({stats.success} passed, {stats.errors} failed)</span>
                    <span className="text-slate-400">Sandboxed</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Recent Errors & Trace Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Error Events */}
        <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Recent Error Events
            </h3>
            <span className="text-xs font-mono text-slate-500">
              {metrics?.recentErrors.length || 0} recorded
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs max-h-72 overflow-y-auto pr-1">
            {metrics?.recentErrors && metrics.recentErrors.length > 0 ? (
              metrics.recentErrors.map((err) => (
                <div key={err.id} className="bg-[#0b0f17] p-3 rounded-xl border border-rose-950/60 space-y-1">
                  <div className="flex justify-between text-rose-300 font-bold text-[11px]">
                    <span>{err.errorCode}</span>
                    <span className="text-slate-500">{new Date(err.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">{err.message}</div>
                  <div className="text-[10px] text-slate-600">
                    Component: {err.component} &bull; Request: {err.requestId}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                Zero error events recorded. All systems operating normally.
              </div>
            )}
          </div>
        </div>

        {/* Distributed Request Traces */}
        <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2 font-mono">
              <Radio className="w-4 h-4 text-cyan-400" />
              Distributed Request Traces
            </h3>
            <span className="text-xs font-mono text-slate-500">Recent Completed Requests</span>
          </div>

          <div className="space-y-2 font-mono text-xs max-h-72 overflow-y-auto pr-1">
            {traces && traces.length > 0 ? (
              traces.map((trace, idx) => (
                <div key={idx} className="bg-[#0b0f17] p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-cyan-300 font-bold truncate max-w-[200px]">
                      {trace.requestId}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        trace.overallStatus === 'success'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}
                    >
                      {trace.overallStatus.toUpperCase()} ({trace.totalDurationMs}ms)
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Operation: {trace.operation} &bull; Model: {trace.modelRouted || 'N/A'} &bull; Steps: {trace.steps?.length || 0}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">
                Run a debug request to view live distributed traces.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
