import React, { useState } from 'react';
import {
  AgentStep,
  AnalysisResult,
  FixResult,
  ReviewResult,
  TestResult,
} from '../types';
import {
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Wrench,
  Terminal,
  ShieldCheck,
  Compass,
} from 'lucide-react';

interface AgentTimelineProps {
  timeline: AgentStep[];
  isAnalyzing: boolean;
  analysis?: AnalysisResult;
  fix?: FixResult;
  test?: TestResult;
  review?: ReviewResult;
}

const AGENT_META: Record<
  string,
  { role: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  Manager: {
    role: 'Coordinator & Orchestrator',
    icon: Compass,
    color: 'from-cyan-500 to-blue-500 text-cyan-400',
  },
  Analyzer: {
    role: 'Static Analysis Specialist',
    icon: Search,
    color: 'from-purple-500 to-indigo-500 text-purple-400',
  },
  Fixer: {
    role: 'Code Repair Specialist',
    icon: Wrench,
    color: 'from-amber-500 to-orange-500 text-amber-400',
  },
  Tester: {
    role: 'Sandbox Verification Specialist',
    icon: Terminal,
    color: 'from-emerald-500 to-teal-500 text-emerald-400',
  },
  Reviewer: {
    role: 'Code Review & Approval Specialist',
    icon: ShieldCheck,
    color: 'from-rose-500 to-pink-500 text-rose-400',
  },
};

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  timeline,
  isAnalyzing,
  analysis,
  fix,
  test,
  review,
}) => {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const toggleExpand = (agent: string) => {
    setExpandedAgent((prev) => (prev === agent ? null : agent));
  };

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-slate-100 flex items-center gap-2">
              Multi-Agent Workflow Timeline
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/60 text-cyan-300">
                5 Cooperating Agents
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Manager → Analyzer → Fixer → Tester → Reviewer → Final Solution
            </p>
          </div>
        </div>

        {isAnalyzing && (
          <span className="flex items-center gap-1.5 text-xs text-cyan-300 font-mono bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
            Pipeline Active
          </span>
        )}
      </div>

      {/* Agents Timeline List */}
      <div className="space-y-2.5">
        {timeline.map((step) => {
          const meta = AGENT_META[step.agent] || {
            role: 'Agent Specialist',
            icon: Users,
            color: 'text-slate-300',
          };
          const Icon = meta.icon;

          const isCompleted = step.status === 'Completed';
          const isWorking = step.status === 'Working';
          const isFailed = step.status === 'Failed';
          const isWaiting = step.status === 'Waiting';

          const isExpanded = expandedAgent === step.agent;

          return (
            <div
              key={step.id}
              className={`rounded-xl border transition-all ${
                isWorking
                  ? 'bg-[#141d30] border-cyan-500/60 shadow-lg shadow-cyan-950/40'
                  : isCompleted
                  ? 'bg-[#0b0f17] border-slate-800 hover:border-slate-700'
                  : isFailed
                  ? 'bg-rose-950/20 border-rose-800/40'
                  : 'bg-[#090d14]/70 border-slate-800/60 opacity-60'
              }`}
            >
              <div
                onClick={() => toggleExpand(step.agent)}
                className="p-3 sm:px-4 flex items-center justify-between gap-3 cursor-pointer select-none"
              >
                {/* Left: Icon, Name, and Role */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      isWorking
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300'
                        : isCompleted
                        ? 'bg-slate-800 border-slate-700 text-slate-300'
                        : isFailed
                        ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                        : 'bg-slate-900 border-slate-800 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-200">
                        {step.agent} Agent
                      </span>
                      {step.cycle && step.cycle > 1 && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-amber-600/40">
                          Cycle {step.cycle}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono truncate">
                      {step.summary || meta.role}
                    </p>
                  </div>
                </div>

                {/* Right: Status indicator */}
                <div className="flex items-center gap-2.5 shrink-0">
                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-400 bg-emerald-950/80 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Completed</span>
                    </span>
                  )}

                  {isWorking && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-300 bg-cyan-950/80 border border-cyan-700/50 px-2.5 py-0.5 rounded-full animate-pulse">
                      <div className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                      <span className="hidden sm:inline">Working</span>
                    </span>
                  )}

                  {isFailed && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-rose-400 bg-rose-950/80 border border-rose-700/50 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Failed / Recheck</span>
                    </span>
                  )}

                  {isWaiting && (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" />
                      <span className="hidden sm:inline">Waiting</span>
                    </span>
                  )}

                  <span className="text-slate-500">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </span>
                </div>
              </div>

              {/* Collapsible Details Drawer */}
              {isExpanded && (
                <div className="px-4 pb-3 pt-1 border-t border-slate-800/80 bg-black/30 text-xs font-mono text-slate-300 space-y-2">
                  <div className="text-slate-400 text-[11px] flex items-center justify-between">
                    <span>Role: {meta.role}</span>
                    <span>Last updated: {step.timestamp}</span>
                  </div>

                  {step.details && (
                    <div className="p-2.5 rounded bg-[#090d14] border border-slate-800 text-slate-200">
                      <pre className="whitespace-pre-wrap font-sans text-xs">{step.details}</pre>
                    </div>
                  )}

                  {/* Agent Specific Deep Data if available */}
                  {step.agent === 'Analyzer' && analysis && (
                    <div className="space-y-1">
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] block">
                        Identified Categories:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {analysis.errorTypes.map((cat, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {step.agent === 'Fixer' && fix && (
                    <div className="space-y-1">
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] block">
                        Modifications:
                      </span>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                        {fix.changes.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {step.agent === 'Tester' && test && (
                    <div className="space-y-1">
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] block">
                        Execution Output:
                      </span>
                      <div className="bg-[#090d14] p-2 rounded border border-slate-800 text-emerald-300">
                        {test.stdout ? (
                          <pre>{test.stdout}</pre>
                        ) : test.stderr ? (
                          <pre className="text-rose-300">{test.stderr}</pre>
                        ) : (
                          <span className="text-slate-500 italic">No output</span>
                        )}
                      </div>
                    </div>
                  )}

                  {step.agent === 'Reviewer' && review && (
                    <div className="space-y-1">
                      <span className="text-slate-400 uppercase tracking-wider text-[10px] block">
                        Review Status:
                      </span>
                      <p
                        className={`font-semibold ${
                          review.approved ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {review.approved ? 'APPROVED' : 'REJECTED FOR REVISION'}
                      </p>
                      <p className="text-slate-300">{review.summary}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
