import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Lightbulb,
  FileCheck,
  ArrowRight,
  Sparkles,
  Layers,
  Code,
  Terminal,
  Clock,
  ShieldCheck,
  Search,
  Wrench,
  Users,
  Globe,
} from 'lucide-react';
import { DebuggingResult } from '../types';
import { LiveWebPreview } from './LiveWebPreview';

interface DebugResultViewProps {
  result: DebuggingResult;
  onApplyCode?: (code: string) => void;
}

export const DebugResultView: React.FC<DebugResultViewProps> = ({ result, onApplyCode }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'agents'>('overview');
  const isWebTechnology = ['HTML', 'CSS', 'JavaScript'].includes(result.language);
  const [showWebPreview, setShowWebPreview] = useState<boolean>(isWebTechnology);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.correctedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy code', e);
    }
  };

  const statusConfig = {
    error_found: {
      label: 'DEFECT RESOLVED',
      bg: 'bg-rose-950/60 border-rose-600/50 text-rose-300',
      icon: AlertCircle,
      glow: 'shadow-rose-900/20',
    },
    warning: {
      label: 'IMPROVEMENT VERIFIED',
      bg: 'bg-amber-950/60 border-amber-600/50 text-amber-300',
      icon: AlertTriangle,
      glow: 'shadow-amber-900/20',
    },
    no_error: {
      label: 'CLEAN CODE CONFIRMED',
      bg: 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300',
      icon: CheckCircle2,
      glow: 'shadow-emerald-900/20',
    },
  }[result.status] || {
    label: 'SOLUTION PRODUCED',
    bg: 'bg-slate-900 border-slate-700 text-slate-300',
    icon: FileCheck,
    glow: 'shadow-slate-900/20',
  };

  const StatusIcon = statusConfig.icon;
  const correctedLines = result.correctedCode.split('\n');
  const exec = result.execution || result.test;
  const rev = result.review;

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* 1. Status Banner & Reviewer Verdict */}
      <div
        className={`rounded-2xl border p-5 shadow-xl ${statusConfig.bg} ${statusConfig.glow} backdrop-blur-sm transition-all`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <StatusIcon className="w-5 h-5 shrink-0" />
            <span className="font-mono font-bold tracking-wider text-sm sm:text-base">
              {statusConfig.label}
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            {rev && (
              <span
                className={`px-2.5 py-0.5 rounded font-bold border flex items-center gap-1 ${
                  rev.approved
                    ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60'
                    : 'bg-amber-950/90 text-amber-300 border-amber-600/60'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Reviewer: {rev.approved ? 'APPROVED' : 'REVISED'}
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-slate-200">
              {result.language}
            </span>
            <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-700/50 text-purple-300">
              Stage 3 Multi-Agent
            </span>
          </div>
        </div>

        {/* Summary text */}
        <div className="mt-3">
          <h4 className="text-xs uppercase tracking-wider font-semibold font-mono text-slate-400 mb-1">
            Manager Synthesis
          </h4>
          <p className="text-slate-100 text-sm sm:text-base leading-relaxed font-sans">
            {result.summary}
          </p>
        </div>

        {/* Error Types Badges */}
        {result.errorTypes && result.errorTypes.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold font-mono text-slate-400 mr-1 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Categories:
            </span>
            {result.errorTypes.map((category, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-black/50 border border-white/15 text-slate-200 shadow-sm"
              >
                {category}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 2. Specialized Agent Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Analyzer Card */}
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center gap-2 mb-1.5 text-purple-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Search className="w-3.5 h-3.5" />
            <span>Analyzer Agent</span>
          </div>
          <p className="text-xs text-slate-300 line-clamp-3 font-sans">
            {result.analysis?.summary || result.problems?.[0]?.description || 'Static analysis completed.'}
          </p>
          <span className="text-[11px] font-mono text-slate-500 mt-2 block">
            {result.problems?.length || 0} issues detected
          </span>
        </div>

        {/* Tester Card */}
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center gap-2 mb-1.5 text-emerald-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Terminal className="w-3.5 h-3.5" />
            <span>Tester Agent</span>
          </div>
          <p className="text-xs text-slate-300 line-clamp-2 font-mono">
            {exec?.attempted
              ? exec.success
                ? `Output: ${exec.stdout || '(Success)'}`
                : `Error: ${exec.stderr || 'Execution failed'}`
              : 'Static mode (execution skipped)'}
          </p>
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 mt-2">
            <span>Exit Code: {exec?.exitCode ?? 0}</span>
            <span>
              {(exec as any)?.attempts || (exec as any)?.attempt || 1} {((exec as any)?.attempts || (exec as any)?.attempt || 1) === 1 ? 'attempt' : 'attempts'}
            </span>
          </div>
        </div>

        {/* Reviewer Card */}
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-3.5 shadow-md">
          <div className="flex items-center gap-2 mb-1.5 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Reviewer Agent</span>
          </div>
          <p className="text-xs text-slate-300 line-clamp-3 font-sans">
            {result.review?.summary || 'Solution passed multi-agent audit.'}
          </p>
          <span
            className={`text-[11px] font-mono font-bold mt-2 block ${
              result.review?.approved ? 'text-emerald-400' : 'text-amber-400'
            }`}
          >
            {result.review?.approved ? '✓ Fully Approved' : '⚠ Revised Solution'}
          </span>
        </div>
      </div>

      {/* 3. Tester Execution Sandbox Output (if attempted) */}
      {exec && exec.attempted && (
        <div className="bg-[#111726] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="bg-[#121929] px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" />
              Tester Agent Live Output
            </span>
            <span
              className={`text-xs font-mono px-2 py-0.5 rounded font-bold ${
                exec.success
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50'
                  : 'bg-rose-950 text-rose-300 border border-rose-700/50'
              }`}
            >
              {exec.success ? 'EXEC: SUCCESS' : 'EXEC: FAILED'}
            </span>
          </div>

          <div className="p-4 bg-[#090d14] font-mono text-xs space-y-2">
            {exec.stdout && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block mb-1">
                  Standard Output (stdout):
                </span>
                <pre className="text-emerald-300 bg-black/40 p-2.5 rounded border border-slate-800/80 whitespace-pre-wrap">
                  {exec.stdout}
                </pre>
              </div>
            )}
            {exec.stderr && (
              <div>
                <span className="text-[10px] uppercase tracking-wider text-rose-400 block mb-1">
                  Standard Error (stderr):
                </span>
                <pre className="text-rose-300 bg-rose-950/20 p-2.5 rounded border border-rose-900/40 whitespace-pre-wrap">
                  {exec.stderr}
                </pre>
              </div>
            )}
            <div className="text-[11px] text-slate-500 pt-1 flex items-center justify-between">
              <span>Execution Time: {exec.executionTime ?? 0}ms</span>
              <span>Controlled Subprocess Sandbox</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Corrected Code Block */}
      <div className="bg-[#0b0f17] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="bg-[#121929] px-4 py-3 border-b border-slate-800/90 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5" />
              Final Verified Code (Fixer + Tester + Reviewer)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isWebTechnology && (
              <button
                type="button"
                onClick={() => setShowWebPreview(!showWebPreview)}
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                  showWebPreview
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-500/60'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                }`}
                title="Toggle interactive live browser rendering"
              >
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>{showWebPreview ? 'Hide Live Web UI' : 'Render Live Web UI'}</span>
              </button>
            )}

            {onApplyCode && (
              <button
                type="button"
                onClick={() => onApplyCode(result.correctedCode)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition-colors"
                title="Replace code in the editor with this fix"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Apply to Editor</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono font-medium rounded transition-all ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex font-mono text-sm max-h-[460px] overflow-auto bg-[#090d14]">
          <div className="select-none bg-[#0c121e] text-slate-600 px-3 py-3 text-right text-xs border-r border-slate-800/60 font-mono shrink-0 min-w-[42px] leading-6">
            {correctedLines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>

          <pre className="p-3 text-emerald-200/90 leading-6 text-sm font-mono overflow-x-auto flex-1">
            <code>{result.correctedCode}</code>
          </pre>
        </div>
      </div>

      {/* Live Web Technology Rendered Preview */}
      {isWebTechnology && showWebPreview && (
        <LiveWebPreview code={result.correctedCode} language={result.language} />
      )}

      {/* 5. What Changed (Fixer Output) */}
      {result.changes && result.changes.length > 0 && (
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs uppercase tracking-wider font-semibold font-mono text-cyan-400 mb-3 flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-cyan-400" />
            Fixer Agent Modifications
          </h3>
          <ul className="space-y-2">
            {result.changes.map((change, index) => (
              <li key={index} className="flex items-start gap-2.5 text-sm text-slate-200 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0"></span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 6. Example Test Scenario */}
      {result.example && (
        <div className="bg-[#111726] border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs uppercase tracking-wider font-semibold font-mono text-indigo-400 mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            Verification Test Scenario
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-[#0b0f17] border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] uppercase tracking-wider font-mono font-semibold text-slate-400 block mb-1">
                Input / Test
              </span>
              <pre className="text-xs font-mono text-slate-200 whitespace-pre-wrap break-all">
                {result.example.input}
              </pre>
            </div>
            <div className="bg-[#0b0f17] border border-slate-800/80 rounded-lg p-3">
              <span className="text-[11px] uppercase tracking-wider font-mono font-semibold text-emerald-400 block mb-1">
                Expected Output
              </span>
              <pre className="text-xs font-mono text-emerald-300 whitespace-pre-wrap break-all">
                {result.example.expectedOutput}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 7. Senior Tutor Learning Tip */}
      {result.learningTip && (
        <div className="rounded-xl p-5 border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-[#131722] to-amber-950/20 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb className="w-4 h-4 text-amber-300" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs uppercase tracking-wider font-mono font-bold text-amber-300 mb-1">
                Senior Tutor Learning Tip
              </h4>
              <p className="text-slate-200 text-sm leading-relaxed font-sans">
                {result.learningTip}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
