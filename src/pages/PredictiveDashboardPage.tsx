import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Flame,
  Layers,
  Wrench,
  Sparkles,
  Clock,
  ArrowRight,
  Eye,
  RefreshCw,
  FileText,
  Check,
  X,
  Search,
  Filter,
  BarChart3,
  Server,
  Package,
  Zap,
  Terminal,
  Play,
  CheckSquare,
} from 'lucide-react';
import {
  PredictionReport,
  RiskArea,
  PreventiveRecommendation,
  EvidenceItem,
  ChangeHotspot,
  TrendTimelinePoint,
} from '../types/predictionTypes';
import {
  ContinuousQualityMetrics,
  QualityGate,
  QualityAlert,
} from '../types/qualityTypes';

export const PredictiveDashboardPage: React.FC = () => {
  const [report, setReport] = useState<PredictionReport | null>(null);
  const [qualityMetrics, setQualityMetrics] = useState<ContinuousQualityMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [qualityScanning, setQualityScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('repo_demo_01');
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceItem | null>(null);
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<
    'continuous-quality' | 'risks' | 'trends' | 'hotspots' | 'recommendations' | 'security' | 'mcp-tools'
  >('continuous-quality');

  // MCP Tool Explorer State
  const [selectedMcpTool, setSelectedMcpTool] = useState<string>('get_repository_history');
  const [mcpToolOutput, setMcpToolOutput] = useState<any>(null);
  const [mcpToolLoading, setMcpToolLoading] = useState<boolean>(false);

  const fetchQualityMetrics = async (repoId: string) => {
    try {
      const res = await fetch(`/api/quality/status?repositoryId=${repoId}`);
      const data = await res.json();
      if (data.success && data.metrics) {
        setQualityMetrics(data.metrics);
      }
    } catch (err: any) {
      console.warn('Failed to load quality metrics', err.message);
    }
  };

  const fetchLatestPrediction = async (repoId: string) => {
    try {
      setLoading(true);
      setError(null);
      await fetchQualityMetrics(repoId);

      const res = await fetch(`/api/predictions?repositoryId=${repoId}`);
      const data = await res.json();
      if (data.success && data.runs && data.runs.length > 0 && data.runs[0].report) {
        setReport(data.runs[0].report);
      } else {
        // Automatically run prediction if none exists
        await handleRunPrediction(repoId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunPrediction = async (repoId: string = selectedRepoId) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/predictions/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: repoId }),
      });
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      } else {
        setError(data.error?.message || 'Failed to complete predictive analysis.');
      }
      await fetchQualityMetrics(repoId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunContinuousMaintenance = async (repoId: string = selectedRepoId) => {
    try {
      setQualityScanning(true);
      setError(null);
      const res = await fetch('/api/quality/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: repoId }),
      });
      const data = await res.json();
      if (data.success && data.result) {
        setQualityMetrics(data.result.metrics);
        // Refresh prediction report too
        const predRes = await fetch(`/api/predictions?repositoryId=${repoId}`);
        const predData = await predRes.json();
        if (predData.success && predData.runs && predData.runs.length > 0) {
          setReport(predData.runs[0].report);
        }
      } else {
        setError(data.error?.message || 'Continuous quality maintenance cycle failed.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setQualityScanning(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const res = await fetch(`/api/quality/alerts/${alertId}/resolve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && qualityMetrics) {
        setQualityMetrics({
          ...qualityMetrics,
          alerts: qualityMetrics.alerts.map((a) => (a.id === alertId ? { ...a, resolved: true } : a)),
        });
      }
    } catch (err: any) {
      console.error('Failed to resolve alert', err);
    }
  };

  const handleUpdateRecommendationStatus = async (
    recId: string,
    status: 'accepted' | 'investigating' | 'dismissed'
  ) => {
    try {
      const res = await fetch(`/api/predictions/recommendations/${recId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success && report) {
        const updatedRecs = report.recommendations.map((r) =>
          r.id === recId ? { ...r, status } : r
        );
        const updatedRiskAreas = report.riskAreas.map((ra) => ({
          ...ra,
          recommendations: ra.recommendations.map((r) =>
            r.id === recId ? { ...r, status } : r
          ),
        }));
        setReport({
          ...report,
          recommendations: updatedRecs,
          riskAreas: updatedRiskAreas,
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRunMcpTool = async (toolName: string) => {
    try {
      setSelectedMcpTool(toolName);
      setMcpToolLoading(true);
      const res = await fetch('/api/mcp/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: toolName,
          arguments: { repositoryId: selectedRepoId, limit: 10 },
        }),
      });
      const data = await res.json();
      setMcpToolOutput(data.result || data);
    } catch (err: any) {
      setMcpToolOutput({ error: err.message });
    } finally {
      setMcpToolLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestPrediction(selectedRepoId);
  }, [selectedRepoId]);

  const filteredRiskAreas = report?.riskAreas.filter((r) => {
    if (filterRisk === 'all') return true;
    return r.riskLevel === filterRisk;
  }) || [];

  const MCP_TOOLS = [
    { name: 'get_repository_history', label: 'Repo History', desc: 'Aggregated engineering telemetry' },
    { name: 'get_test_history', label: 'Test History', desc: 'Recorded unit & regression test runs' },
    { name: 'get_build_history', label: 'Build History', desc: 'CI/CD compilation & build durations' },
    { name: 'get_security_history', label: 'Security History', desc: 'SAST static audits & vulnerability findings' },
    { name: 'get_dependency_history', label: 'Dependency Inventory', desc: 'Package dependencies & CVE advisories' },
    { name: 'get_performance_history', label: 'Performance Latency', desc: 'P95 response times & execution metrics' },
    { name: 'get_change_hotspots', label: 'Change Hotspots', desc: 'High-churn modules & failure correlation' },
    { name: 'get_maintenance_history', label: 'Maintenance Log', desc: 'Audit records of past fixes & regressions' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-700/50">
              Phase 9: Continuous Quality
            </span>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold tracking-wider uppercase bg-indigo-950/80 text-indigo-400 border border-indigo-700/50">
              Phase 10: Predictive Engineering
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-slate-100 flex items-center gap-3 mt-2">
            <TrendingUp className="w-8 h-8 text-cyan-400" />
            Continuous Quality &amp; Predictive Maintenance
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-mono">
            Evidence-backed quality health monitoring, multi-language static analysis (HTML, CSS, JS, Python), and proactive defect prevention.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={selectedRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="bg-[#111726] border border-slate-700 text-slate-200 text-xs sm:text-sm font-mono rounded-lg px-3 py-2 outline-none cursor-pointer hover:border-cyan-500/50"
          >
            <option value="repo_demo_01">auth-api-demo (Auth, Payments, Web)</option>
          </select>

          <button
            type="button"
            onClick={() => handleRunContinuousMaintenance(selectedRepoId)}
            disabled={qualityScanning}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 text-emerald-300 border border-emerald-600/60 font-mono text-xs sm:text-sm font-bold shadow-md transition-all disabled:opacity-50"
            title="Runs automated regression test suites, static quality gates, and feeds predictive telemetry"
          >
            <Activity className={`w-4 h-4 ${qualityScanning ? 'animate-spin' : 'text-emerald-400'}`} />
            <span>{qualityScanning ? 'Executing Cycle...' : 'Run Quality Cycle (Phase 9)'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleRunPrediction(selectedRepoId)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-mono text-xs sm:text-sm font-bold shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Synthesizing...' : 'Predictive Analysis (Phase 10)'}</span>
          </button>
        </div>
      </div>

      {/* Core Principle Callout */}
      <div className="bg-[#0b0f17] border border-indigo-900/50 rounded-xl p-4 mb-8 text-xs font-mono text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-slate-100">Continuous &amp; Predictive Guard:</strong> Phase 9 continuously monitors regressions and static conformity (HTML, CSS, JS, Python). Phase 10 aggregates corroborated telemetry to predict failure hotspots before production deployment.
          </span>
        </div>
        <div className="text-slate-400 text-[11px] shrink-0">
          Last Verified: {report ? new Date(report.generatedAt).toLocaleTimeString() : 'Live'}
        </div>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-800 rounded-xl p-4 mb-8 text-red-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider block mb-1">
            Quality Health Score
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-300">
              {qualityMetrics ? `${qualityMetrics.healthScore}%` : '88%'}
            </span>
            <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-emerald-950 border border-emerald-600/50 text-emerald-300">
              Grade {qualityMetrics?.grade || 'A'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400">Continuous Monitoring Active</span>
        </div>

        <div className="bg-[#111726] border border-rose-900/30 rounded-xl p-4">
          <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider block mb-1">
            High Risk Areas
          </span>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {report?.summary.highRiskCount ?? 1}
          </div>
          <span className="text-[11px] text-rose-300/80">requires prompt attention</span>
        </div>

        <div className="bg-[#111726] border border-amber-900/30 rounded-xl p-4">
          <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider block mb-1">
            Test Stability Index
          </span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {qualityMetrics ? `${qualityMetrics.testStabilityIndex}%` : '85%'}
          </div>
          <span className="text-[11px] text-amber-300/80">
            {qualityMetrics?.flakyTestCount || 0} flaky tests detected
          </span>
        </div>

        <div className="bg-[#111726] border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider block mb-1">
            Change Hotspots
          </span>
          <div className="text-2xl font-bold font-mono text-indigo-300">
            {report?.summary.totalHotspots ?? 3}
          </div>
          <span className="text-[11px] text-slate-400">frequently modified modules</span>
        </div>

        <div className="bg-[#111726] border border-emerald-900/30 rounded-xl p-4 col-span-2 lg:col-span-1">
          <span className="text-slate-400 text-[11px] font-mono uppercase tracking-wider block mb-1">
            Preventive Actions
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-300">
            {report?.summary.recommendedActionsCount ?? 3}
          </div>
          <span className="text-[11px] text-emerald-400/80">actionable recommendations</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 gap-2 mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('continuous-quality')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'continuous-quality'
              ? 'border-emerald-400 text-emerald-300 font-bold bg-emerald-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-400" />
          <span>Continuous Quality (Phase 9)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('risks')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'risks'
              ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-cyan-400" />
          <span>Risk Areas ({report?.riskAreas.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('trends')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'trends'
              ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span>4-Week Trends</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('hotspots')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'hotspots'
              ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-4 h-4 text-rose-400" />
          <span>Change Hotspots ({report?.hotspots.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('recommendations')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'recommendations'
              ? 'border-cyan-400 text-cyan-300 font-bold bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Wrench className="w-4 h-4 text-emerald-400" />
          <span>Recommendations ({report?.recommendations.length || 0})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('mcp-tools')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-mono font-medium border-b-2 transition-all whitespace-nowrap ${
            activeSubTab === 'mcp-tools'
              ? 'border-purple-400 text-purple-300 font-bold bg-purple-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Server className="w-4 h-4 text-purple-400" />
          <span>MCP Telemetry Tools (Phase 10)</span>
        </button>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 0: PHASE 9 CONTINUOUS QUALITY & MAINTENANCE MONITOR */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'continuous-quality' && (
        <div className="space-y-6">
          {/* Quality Gates Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm uppercase font-mono font-bold text-emerald-400 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Automated Quality Health Gates (Phase 9)
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Continuous Build, Test, Security, and Flaky Test Watchdogs
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {qualityMetrics?.gates.map((gate) => (
                <div
                  key={gate.id}
                  className={`bg-[#111726] border rounded-xl p-4 shadow-lg transition-all ${
                    gate.status === 'passed'
                      ? 'border-emerald-700/40 hover:border-emerald-500/60'
                      : gate.status === 'warning'
                      ? 'border-amber-700/40 hover:border-amber-500/60'
                      : 'border-rose-700/40 hover:border-rose-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-mono font-semibold text-xs text-slate-200">
                      {gate.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                        gate.status === 'passed'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-600/60'
                          : gate.status === 'warning'
                          ? 'bg-amber-950 text-amber-300 border-amber-600/60'
                          : 'bg-rose-950 text-rose-300 border-rose-600/60'
                      }`}
                    >
                      {gate.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="text-base font-bold font-mono text-slate-100">
                      {gate.metricLabel}
                    </div>
                    <p className="text-xs text-slate-400 font-sans mt-1">
                      {gate.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-500 flex justify-between">
                    <span>Threshold:</span>
                    <span className="text-slate-400">{gate.threshold}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Proactive Quality Alerts Feed */}
          <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-xs uppercase font-mono font-bold text-amber-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Active Proactive Maintenance Alerts ({qualityMetrics?.alerts.filter((a) => !a.resolved).length || 0})
              </h3>
              <span className="text-xs font-mono text-slate-400">
                Triggered automatically by continuous test failure and security drift telemetry
              </span>
            </div>

            {(!qualityMetrics?.alerts || qualityMetrics.alerts.length === 0) ? (
              <div className="text-center py-6 text-slate-500 font-mono text-xs">
                No active continuous maintenance alerts. All quality gates green.
              </div>
            ) : (
              <div className="space-y-3">
                {qualityMetrics.alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      alert.resolved
                        ? 'bg-slate-900/40 border-slate-800 opacity-60'
                        : alert.severity === 'critical'
                        ? 'bg-rose-950/30 border-rose-800/50'
                        : 'bg-amber-950/20 border-amber-800/40'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded ${
                            alert.severity === 'critical'
                              ? 'bg-rose-900 text-rose-200'
                              : 'bg-amber-900 text-amber-200'
                          }`}
                        >
                          {alert.severity}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-200">
                          {alert.title}
                        </span>
                        <span className="text-[11px] font-mono text-cyan-400">
                          [{alert.affectedModule}]
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 font-sans">
                        {alert.description}
                      </p>
                      <div className="text-[11px] text-emerald-400/90 font-mono flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        <span>Action: {alert.suggestedAction}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {alert.resolved ? (
                        <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          Resolved
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleResolveAlert(alert.id)}
                          className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Continuous Maintenance Action CTA */}
          <div className="bg-gradient-to-r from-emerald-950/60 via-[#10192a] to-cyan-950/50 border border-emerald-500/40 rounded-xl p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold font-mono text-emerald-300 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Autonomous Continuous Maintenance Runner
              </h4>
              <p className="text-xs text-slate-300 font-sans mt-1">
                Executes the continuous regression suite, evaluates HTML/CSS/JS syntax conformity, records fresh test/build telemetry, and recalibrates predictive risk models.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRunContinuousMaintenance(selectedRepoId)}
              disabled={qualityScanning}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{qualityScanning ? 'Running Scan...' : 'Trigger Maintenance Cycle'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 1: RISK AREAS & EVIDENCE CARDS (PHASE 10) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'risks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-mono text-slate-400">Filter Level:</span>
              {(['all', 'high', 'medium', 'low'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setFilterRisk(lvl)}
                  className={`text-[11px] font-mono uppercase px-2.5 py-0.5 rounded transition-colors ${
                    filterRisk === lvl
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-800/40'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>

            <span className="text-xs font-mono text-slate-400">
              Showing {filteredRiskAreas.length} evaluated risk modules
            </span>
          </div>

          <div className="space-y-4">
            {filteredRiskAreas.map((area, idx) => (
              <div
                key={idx}
                className={`bg-[#111726] border rounded-xl p-5 shadow-lg transition-all ${
                  area.riskLevel === 'high'
                    ? 'border-rose-900/60 hover:border-rose-600/80'
                    : area.riskLevel === 'medium'
                    ? 'border-amber-900/60 hover:border-amber-600/80'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-mono font-bold uppercase px-2.5 py-0.5 rounded border ${
                        area.riskLevel === 'high'
                          ? 'bg-rose-950 text-rose-300 border-rose-600/50'
                          : area.riskLevel === 'medium'
                          ? 'bg-amber-950 text-amber-300 border-amber-600/50'
                          : 'bg-emerald-950 text-emerald-300 border-emerald-600/50'
                      }`}
                    >
                      {area.riskLevel.toUpperCase()} RISK
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono text-slate-100">
                      {area.area}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-slate-400">Confidence:</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        area.confidence === 'high'
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {area.confidence.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs uppercase font-mono font-semibold text-slate-400 block mb-1">
                      Signal Drivers:
                    </span>
                    <ul className="space-y-1">
                      {area.primaryDrivers.map((driver, dIdx) => (
                        <li key={dIdx} className="text-xs text-slate-200 font-sans flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0"></span>
                          <span>{driver}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="text-xs uppercase font-mono font-semibold text-amber-400 block mb-1">
                      AI Interpretation &amp; Reasoning:
                    </span>
                    <p className="text-xs text-slate-300 font-sans leading-relaxed">
                      {area.interpretation || area.reason}
                    </p>
                  </div>
                </div>

                {/* Evidence items count & Inspector link */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-mono text-slate-400">
                    {area.evidence.length} Corroborated Evidence Records
                  </span>

                  <div className="flex items-center gap-2">
                    {area.evidence.slice(0, 2).map((ev, evIdx) => (
                      <button
                        key={evIdx}
                        type="button"
                        onClick={() => setSelectedEvidence(ev)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect {ev.category} Evidence</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 2: 4-WEEK TRENDS (PHASE 10) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'trends' && (
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-lg space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm uppercase font-mono font-bold text-indigo-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                4-Week Corroborated Engineering Telemetry
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Week-over-week trends in test failures, CI build stability, vulnerabilities, and latency.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Trajectory:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-amber-950 text-amber-300 border border-amber-600/50">
                {report?.timeline && report.timeline.length > 1 && report.timeline[report.timeline.length - 1].testFailures > report.timeline[0].testFailures ? 'INCREASING' : 'STABLE'} FAILURE TRAJECTORY
              </span>
            </div>
          </div>

          {/* Timeline Points Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#0b0f17] text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Period</th>
                  <th className="p-3">Test Failures</th>
                  <th className="p-3">Build Failures</th>
                  <th className="p-3">Security Findings</th>
                  <th className="p-3">Outdated Deps</th>
                  <th className="p-3">Maintenance Events</th>
                  <th className="p-3">P95 Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {report?.timeline.map((point: TrendTimelinePoint, i: number) => (
                  <tr key={i} className="hover:bg-slate-800/30">
                    <td className="p-3 font-semibold text-slate-200">
                      {point.period} <span className="text-[11px] text-slate-500">({point.dateLabel})</span>
                    </td>
                    <td className="p-3">
                      <span className={`font-bold ${point.testFailures > 3 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {point.testFailures}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`font-bold ${point.buildFailures > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {point.buildFailures}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300">{point.securityFindings}</td>
                    <td className="p-3 text-slate-300">{point.dependencyFindings}</td>
                    <td className="p-3 text-slate-300">{point.maintenanceEvents}</td>
                    <td className="p-3 text-cyan-300">{point.p95LatencyMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 3: CHANGE HOTSPOTS (PHASE 10) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'hotspots' && (
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm uppercase font-mono font-bold text-rose-400 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-400" />
              Repository Code Churn &amp; Change Hotspots
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Correlating frequent commit edits with failure recurrence
            </span>
          </div>

          <div className="space-y-3">
            {report?.hotspots.map((h, i) => (
              <div
                key={i}
                className="bg-[#0b0f17] border border-slate-800/80 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-300">{h.path}</span>
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/50">
                      Score: {h.riskScore}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 mt-1">
                    <span>{h.changesCount} recent edits</span>
                    <span>•</span>
                    <span>{h.failureCount} test failures</span>
                    <span>•</span>
                    <span>{h.maintenanceCount} past bug fixes</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">Complexity: {h.complexityScore}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 4: PREVENTIVE RECOMMENDATIONS (PHASE 10) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'recommendations' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm uppercase font-mono font-bold text-emerald-400 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" />
              Developer-Governed Preventive Actions
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Strictly require human review before applying changes
            </span>
          </div>

          <div className="space-y-3">
            {report?.recommendations.map((rec) => (
              <div
                key={rec.id}
                className="bg-[#111726] border border-slate-800 rounded-xl p-4 shadow-lg flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded border ${
                        rec.priority === 'high'
                          ? 'bg-rose-950 text-rose-300 border-rose-700/50'
                          : 'bg-amber-950 text-amber-300 border-amber-700/50'
                      }`}
                    >
                      {rec.priority.toUpperCase()} PRIORITY
                    </span>
                    <span className="text-sm font-bold font-mono text-slate-100">
                      {rec.title}
                    </span>
                    <span className="text-xs font-mono text-cyan-400">({rec.area})</span>
                  </div>

                  <span
                    className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      rec.status === 'accepted'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                        : rec.status === 'investigating'
                        ? 'bg-amber-950 text-amber-300 border border-amber-600/50'
                        : rec.status === 'dismissed'
                        ? 'bg-slate-800 text-slate-400'
                        : 'bg-indigo-950 text-indigo-300 border border-indigo-600/50'
                    }`}
                  >
                    STATUS: {rec.status.toUpperCase()}
                  </span>
                </div>

                <div className="text-xs font-sans text-slate-300 space-y-1">
                  <p><strong className="text-slate-200">Recommended Action:</strong> {rec.action}</p>
                  <p className="text-slate-400"><strong className="text-slate-300">Evidence Summary:</strong> {rec.evidenceSummary}</p>
                  {rec.suggestedPatchPlan && (
                    <div className="mt-2 bg-[#090d14] p-2.5 rounded border border-slate-800 text-cyan-300 font-mono text-[11px]">
                      Plan: {rec.suggestedPatchPlan}
                    </div>
                  )}
                </div>

                {/* Developer Governance Buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleUpdateRecommendationStatus(rec.id, 'accepted')}
                    disabled={rec.status === 'accepted'}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-mono rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/50 disabled:opacity-40 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept Action</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateRecommendationStatus(rec.id, 'investigating')}
                    disabled={rec.status === 'investigating'}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-mono rounded bg-amber-950/80 hover:bg-amber-900 text-amber-300 border border-amber-700/50 disabled:opacity-40 transition-colors"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Investigate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUpdateRecommendationStatus(rec.id, 'dismissed')}
                    disabled={rec.status === 'dismissed'}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-400 disabled:opacity-40 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Dismiss</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-TAB 5: LIVE MCP TELEMETRY TOOLS EXPLORER (PHASE 10) */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'mcp-tools' && (
        <div className="bg-[#111726] border border-purple-900/40 rounded-xl p-5 shadow-lg space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm uppercase font-mono font-bold text-purple-400 flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-400" />
                Phase 10 MCP Historical Telemetry Tools
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Execute the 8 standardized Model Context Protocol tools to inspect raw repository engineering data.
              </p>
            </div>
            <span className="text-xs font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
              MCP Server v1.0.0
            </span>
          </div>

          {/* Tools Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MCP_TOOLS.map((tool) => (
              <button
                key={tool.name}
                type="button"
                onClick={() => handleRunMcpTool(tool.name)}
                disabled={mcpToolLoading}
                className={`p-2.5 rounded-lg border text-left font-mono transition-all ${
                  selectedMcpTool === tool.name
                    ? 'bg-purple-950 text-purple-200 border-purple-500 shadow-md font-semibold'
                    : 'bg-[#0b0f17] text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold truncate">{tool.label}</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">{tool.name}</div>
              </button>
            ))}
          </div>

          {/* Tool Output Console */}
          <div className="bg-[#090d14] rounded-xl border border-slate-800 p-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3 text-slate-400 text-[11px]">
              <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                mcp_server.executeTool('{selectedMcpTool}')
              </span>
              <span>{mcpToolLoading ? 'Querying telemetry...' : 'Ready'}</span>
            </div>

            {mcpToolLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-cyan-400" />
                <span>Executing MCP Tool handler...</span>
              </div>
            ) : mcpToolOutput ? (
              <pre className="text-slate-200 leading-relaxed max-h-[360px] overflow-y-auto whitespace-pre-wrap p-2 bg-black/40 rounded border border-slate-900">
                {JSON.stringify(mcpToolOutput, null, 2)}
              </pre>
            ) : (
              <div className="text-slate-500 italic py-8 text-center">
                Click any tool button above to execute that MCP tool and inspect its response payload.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 5-LAYER EVIDENCE INSPECTOR MODAL */}
      {/* ------------------------------------------------------------- */}
      {selectedEvidence && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#111726] border border-cyan-500/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <h3 className="font-mono font-bold text-sm text-slate-100 uppercase">
                  5-Layer Evidence Inspector ({selectedEvidence.category.toUpperCase()})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEvidence(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="bg-[#0b0f17] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">
                  1. Observation
                </span>
                <p className="text-slate-200">{selectedEvidence.observation}</p>
              </div>

              <div className="bg-[#0b0f17] p-3 rounded-lg border border-slate-800">
                <span className="text-cyan-400 text-[10px] uppercase font-bold block mb-0.5">
                  2. Measured Evidence
                </span>
                <p className="text-cyan-200">{selectedEvidence.evidenceText}</p>
                <div className="mt-1 text-[11px] text-slate-500">Source: {selectedEvidence.source}</div>
              </div>

              <div className="bg-[#0b0f17] p-3 rounded-lg border border-slate-800">
                <span className="text-amber-400 text-[10px] uppercase font-bold block mb-0.5">
                  3. AI Interpretation
                </span>
                <p className="text-amber-200/90">{selectedEvidence.interpretation}</p>
              </div>

              <div className="bg-[#0b0f17] p-3 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">
                  4. Uncertainty &amp; Limitation
                </span>
                <p className="text-slate-400">{selectedEvidence.uncertainty}</p>
              </div>

              <div className="bg-[#0b0f17] p-3 rounded-lg border border-emerald-900/50">
                <span className="text-emerald-400 text-[10px] uppercase font-bold block mb-0.5">
                  5. Actionable Recommendation
                </span>
                <p className="text-emerald-300">
                  Targeted review and regression test suite expansion recommended before next production release.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEvidence(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
