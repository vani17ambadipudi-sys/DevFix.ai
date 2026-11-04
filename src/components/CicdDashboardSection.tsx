import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Play,
  RotateCw,
  Server,
  Box,
  Layers,
  ShieldCheck,
  ExternalLink,
  Terminal,
  Activity,
  ArrowUpRight,
  Info,
} from 'lucide-react';

interface StageStatuses {
  ciStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  lintStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  typecheckStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  unitTestStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  integrationTestStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  buildFrontendStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  buildBackendStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  dockerValidationStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  deploymentStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
}

interface WorkflowRunSummary {
  id: number;
  name: string;
  headBranch: string;
  headSha: string;
  headShaShort: string;
  event: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion: 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | null;
  workflowUrl: string;
  createdAt: string;
  updatedAt: string;
  durationSeconds: number;
  author: string;
  commitMessage: string;
  stages: StageStatuses;
}

interface PipelineFailure {
  id: number;
  name: string;
  headBranch: string;
  headShaShort: string;
  commitMessage: string;
  failedAt: string;
  failedJobName?: string;
  failedStepName?: string;
  htmlUrl: string;
}

interface CicdData {
  configured: boolean;
  repository?: string;
  hasToken?: boolean;
  message?: string;
  latestRun: WorkflowRunSummary | null;
  lastSuccessfulDeployment: {
    deployedAt: string;
    commitShaShort: string;
    headBranch: string;
    environment: string;
    workflowRunId: number;
  } | null;
  recentFailures: PipelineFailure[];
  renderDeployment: {
    hookConfigured: boolean;
    serviceIdConfigured: boolean;
    productionHealthUrl?: string;
  };
  pipelineDefinition: {
    workflowPath: string;
    triggers: string[];
    requiredStages: string[];
  };
}

export const CicdDashboardSection: React.FC = () => {
  const [cicdData, setCicdData] = useState<CicdData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<any>(null);
  const [isProbingHealth, setIsProbingHealth] = useState(false);
  const [healthProbeResult, setHealthProbeResult] = useState<any>(null);

  const fetchCicdStatus = async () => {
    try {
      const res = await fetch('/api/cicd/status');
      const data = await res.json();
      if (data.success) {
        setCicdData(data.data);
      }
    } catch (err) {
      console.error('Failed to load CI/CD status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCicdStatus();
    const interval = setInterval(fetchCicdStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  const runLocalCiSimulation = async () => {
    setIsSimulating(true);
    setSimulationResult(null);
    try {
      const res = await fetch('/api/cicd/simulate-local-ci', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setSimulationResult(data.data);
      }
    } catch (err: any) {
      setSimulationResult({ allPassed: false, error: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  const probeHealthEndpoint = async () => {
    setIsProbingHealth(true);
    setHealthProbeResult(null);
    try {
      const res = await fetch('/api/cicd/health-check');
      const data = await res.json();
      setHealthProbeResult(data.data);
    } catch (err: any) {
      setHealthProbeResult({ success: false, error: err.message });
    } finally {
      setIsProbingHealth(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
          </span>
        );
      case 'failed':
      case 'failure':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-400 border border-rose-800">
            <XCircle className="w-3.5 h-3.5" /> FAILED
          </span>
        );
      case 'running':
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">
            <RotateCw className="w-3.5 h-3.5 animate-spin" /> RUNNING
          </span>
        );
      case 'skipped':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            SKIPPED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800">
            PENDING
          </span>
        );
    }
  };

  const formatDuration = (seconds: number = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <GitBranch className="w-5 h-5 text-indigo-400" />
            CI/CD Pipeline & Deployment Orchestration
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic build verification, 14 automated test suites, container validation, and Render deployment gates
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={probeHealthEndpoint}
            disabled={isProbingHealth}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
          >
            <Activity className={`w-3.5 h-3.5 text-cyan-400 ${isProbingHealth ? 'animate-spin' : ''}`} />
            Probe Health Endpoint
          </button>
          <button
            onClick={runLocalCiSimulation}
            disabled={isSimulating}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-lg shadow-indigo-600/20 transition"
          >
            <Play className={`w-3.5 h-3.5 fill-white ${isSimulating ? 'animate-spin' : ''}`} />
            {isSimulating ? 'Executing Pre-Flight...' : 'Run Pre-Flight CI Checks'}
          </button>
        </div>
      </div>

      {/* Health Probe Popup Result */}
      {healthProbeResult && (
        <div className="p-4 bg-[#0d131f] border border-cyan-800/60 rounded-2xl flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            <div>
              <span className="text-slate-300">Live Health Probe: </span>
              <span className={`font-bold ${healthProbeResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                HTTP {healthProbeResult.statusCode || 'ERR'} ({healthProbeResult.responseTimeMs}ms)
              </span>
              <span className="text-slate-500 ml-2">
                status: {healthProbeResult.data?.status || 'unreachable'}
              </span>
            </div>
          </div>
          <button
            onClick={() => setHealthProbeResult(null)}
            className="text-slate-500 hover:text-slate-300 text-xs"
          >
            &times;
          </button>
        </div>
      )}

      {/* Local Simulation Report */}
      {simulationResult && (
        <div className="p-4 bg-[#0d131f] border border-indigo-900/60 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Pre-Flight CI Simulation Results (Local Host)
            </h4>
            <div className="flex items-center gap-2">
              {simulationResult.allPassed ? (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
                  ALL PRE-FLIGHT CHECKS PASSED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950 text-rose-400 border border-rose-800">
                  PRE-FLIGHT BLOCKED
                </span>
              )}
              <button
                onClick={() => setSimulationResult(null)}
                className="text-slate-500 hover:text-slate-300 text-xs ml-2"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {simulationResult.executedSteps?.map((step: any, idx: number) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-xs font-mono ${
                  step.passed
                    ? 'bg-emerald-950/20 border-emerald-900/40 text-emerald-300'
                    : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                }`}
              >
                <div className="font-semibold truncate">{step.name}</div>
                <div className="text-[11px] opacity-75">{step.durationMs}ms &bull; {step.passed ? 'OK' : 'FAIL'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Status Grid */}
      {cicdData?.configured && cicdData.latestRun ? (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CI Status */}
            <div className="bg-[#111726] border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>CI Pipeline Status</span>
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-white capitalize">
                  {cicdData.latestRun.conclusion || cicdData.latestRun.status}
                </span>
                {getStatusBadge(cicdData.latestRun.conclusion || cicdData.latestRun.status)}
              </div>
              <div className="text-[11px] font-mono text-slate-500 truncate">
                Duration: {formatDuration(cicdData.latestRun.durationSeconds)}
              </div>
            </div>

            {/* Commit & Branch */}
            <div className="bg-[#111726] border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Commit & Branch</span>
                <GitCommit className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold font-mono text-cyan-300">
                  {cicdData.latestRun.headShaShort}
                </span>
                <span className="px-2 py-0.5 bg-slate-800 rounded text-xs font-mono text-slate-300">
                  {cicdData.latestRun.headBranch}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 truncate" title={cicdData.latestRun.commitMessage}>
                {cicdData.latestRun.commitMessage}
              </div>
            </div>

            {/* Deployment Status */}
            <div className="bg-[#111726] border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Render Deployment</span>
                <Server className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-white">
                  {cicdData.latestRun.stages.deploymentStatus.toUpperCase()}
                </span>
                {getStatusBadge(cicdData.latestRun.stages.deploymentStatus)}
              </div>
              <div className="text-[11px] font-mono text-slate-500">
                Target: Render Web Service
              </div>
            </div>

            {/* Last Successful Deployment */}
            <div className="bg-[#111726] border border-slate-800 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>Last Production Release</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-base font-bold text-white font-mono">
                  {cicdData.lastSuccessfulDeployment?.commitShaShort || 'None recorded'}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {cicdData.lastSuccessfulDeployment?.headBranch || 'N/A'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                {cicdData.lastSuccessfulDeployment?.deployedAt
                  ? new Date(cicdData.lastSuccessfulDeployment.deployedAt).toLocaleString()
                  : 'Awaiting first automated release'}
              </div>
            </div>
          </div>

          {/* Pipeline Stage Matrix */}
          <div className="bg-[#111726] border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Pipeline Execution Stages (Latest Run #{cicdData.latestRun.id})
              </h3>
              <a
                href={cicdData.latestRun.workflowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
              >
                View on GitHub Actions <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              {[
                { label: 'Code Lint', status: cicdData.latestRun.stages.lintStatus },
                { label: 'Typecheck', status: cicdData.latestRun.stages.typecheckStatus },
                { label: 'Unit Tests', status: cicdData.latestRun.stages.unitTestStatus },
                { label: 'Integration', status: cicdData.latestRun.stages.integrationTestStatus },
                { label: 'Frontend', status: cicdData.latestRun.stages.buildFrontendStatus },
                { label: 'Backend', status: cicdData.latestRun.stages.buildBackendStatus },
                { label: 'Docker', status: cicdData.latestRun.stages.dockerValidationStatus },
                { label: 'Render CD', status: cicdData.latestRun.stages.deploymentStatus },
              ].map((stage, idx) => (
                <div
                  key={idx}
                  className="bg-[#0b0f17] p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between space-y-2 text-center"
                >
                  <span className="text-[11px] font-semibold text-slate-300 truncate">{stage.label}</span>
                  <div>{getStatusBadge(stage.status)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Failures List */}
          {cicdData.recentFailures && cicdData.recentFailures.length > 0 && (
            <div className="bg-[#111726] border border-rose-950/60 rounded-2xl p-6 space-y-3">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                Recent Pipeline Failures ({cicdData.recentFailures.length})
              </h3>
              <div className="space-y-2">
                {cicdData.recentFailures.map((failure) => (
                  <div
                    key={failure.id}
                    className="bg-[#0b0f17] p-3 rounded-xl border border-rose-900/40 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-rose-300">Run #{failure.id}</span>
                        <span className="font-mono text-slate-400">{failure.headShaShort}</span>
                        <span className="px-1.5 py-0.2 bg-slate-800 rounded text-[10px] text-slate-300">
                          {failure.headBranch}
                        </span>
                      </div>
                      <div className="text-slate-400 text-[11px] truncate max-w-md">{failure.commitMessage}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 text-[11px]">
                        {new Date(failure.failedAt).toLocaleDateString()}
                      </span>
                      <a
                        href={failure.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1"
                      >
                        Logs <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Explicit Unconfigured State — No fake data generated! */
        <div className="bg-[#111726] border border-slate-800 rounded-3xl p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-amber-400">
              <Info className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">
                GitHub Actions Telemetry Integration Unavailable
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                {cicdData?.message ||
                  'GitHub API integration is unconfigured. Set GITHUB_REPOSITORY (e.g. "my-org/devfix-ai") and optional GITHUB_TOKEN in your environment to stream live workflow execution telemetry, step durations, and deployment traces.'}
              </p>
            </div>
          </div>

          {/* Deterministic Pipeline Architecture Preview */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Box className="w-4 h-4 text-cyan-400" />
              Configured 12-Stage CI Pipeline Architecture (.github/workflows/ci.yml)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                { step: '01', title: 'Checkout Repository', desc: 'actions/checkout@v4' },
                { step: '02', title: 'Setup Node.js 22', desc: 'actions/setup-node@v4 with cache' },
                { step: '03', title: 'Setup Python 3.10', desc: 'actions/setup-python@v5 with pip cache' },
                { step: '04', title: 'NPM Clean Install', desc: 'npm ci (lockfile verified)' },
                { step: '05', title: 'Python Dependencies', desc: 'torch, numpy, matplotlib' },
                { step: '06', title: 'Code Linting', desc: 'npm run lint' },
                { step: '07', title: 'Type Checking', desc: 'npm run typecheck (tsc)' },
                { step: '08', title: 'Unit Tests (10 suites)', desc: 'npm run test:unit' },
                { step: '09', title: 'Integration Tests (4)', desc: 'npm run test:integration' },
                { step: '10', title: 'Frontend Build', desc: 'npm run build:frontend (Vite)' },
                { step: '11', title: 'Backend Build', desc: 'npm run build:backend (esbuild)' },
                { step: '12', title: 'Docker Build Check', desc: 'docker build with venv' },
              ].map((item, idx) => (
                <div key={idx} className="bg-[#0b0f17] p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400">
                    <span>STAGE {item.step}</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                  <div className="text-xs font-semibold text-slate-200">{item.title}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Render Setup Callout */}
          <div className="p-4 bg-[#0b0f17] rounded-2xl border border-indigo-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-indigo-300">Continuous Deployment Gate to Render</span>
              <p className="text-slate-400 text-[11px]">
                Requires <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300">RENDER_DEPLOY_HOOK_URL</code> in GitHub Secrets. Deployments execute only after all 12 CI checks pass on the <code className="text-amber-300">main</code> branch.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${cicdData?.renderDeployment.hookConfigured ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-400'}`}>
                Deploy Hook: {cicdData?.renderDeployment.hookConfigured ? 'CONFIGURED' : 'UNCONFIGURED'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
