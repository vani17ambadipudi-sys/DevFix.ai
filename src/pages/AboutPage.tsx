import React from 'react';
import {
  Bot,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Layers,
  Workflow,
  Wrench,
  Users,
  Compass,
  Search,
  RotateCw,
  Server,
  FileCode,
  FolderTree,
  BookOpen,
  Shield,
  Zap,
  Cpu,
  Activity,
  FolderGit2,
  TrendingUp,
  Flame,
} from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fadeIn font-sans">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-600/60 text-indigo-300 font-mono text-xs font-semibold uppercase tracking-wider mb-4 shadow-lg shadow-indigo-900/20">
          <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
          <span>CURRENT STAGE: STAGE 10 (PREDICTIVE ENGINEERING)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 tracking-tight font-mono mb-4">
          DevFix AI Evolution
        </h1>
        <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-sans">
          From reactive single-snippet debugging to an autonomous, repository-level{' '}
          <span className="text-indigo-400 font-semibold font-mono">Predictive Software Engineering Platform</span>{' '}
          correlating historical signals to recommend preventive maintenance before bugs hit production.
        </p>
      </div>

      {/* Stage 10 Highlight Banner */}
      <div className="bg-[#111726] border border-indigo-500/40 rounded-2xl p-6 sm:p-8 mb-12 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-mono font-bold tracking-wider uppercase">
            STAGE 10: PREDICTIVE SOFTWARE ENGINEERING
          </span>
        </div>
        <h2 className="text-lg sm:text-xl font-bold font-mono text-indigo-300 mb-2 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          Evidence-First Predictive Maintenance
        </h2>
        <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-4">
          In Stage 10, DevFix AI moves beyond reactive bug patching to identify modules accumulating stability risks. By aggregating historical test failure frequencies, code churn, dependency advisories, and performance telemetry, specialized predictive agents formulate evidence-backed preventive recommendations with complete developer approval.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono">
          <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-slate-300">
            <div className="text-cyan-400 font-bold mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> 5-Layer Evidence Model
            </div>
            Observation &rarr; Measured Evidence &rarr; Interpretation &rarr; Uncertainty &rarr; Action
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-slate-300">
            <div className="text-indigo-400 font-bold mb-1 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" /> 18 Standardized MCP Tools
            </div>
            Expanded protocol exposing test history, change hotspots, build logs, and security advisories.
          </div>

          <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-slate-300">
            <div className="text-amber-400 font-bold mb-1 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" /> Developer-in-the-Loop
            </div>
            Preventive recommendations require explicit developer acceptance before entering patch workflows.
          </div>
        </div>
      </div>

      {/* 10 Evolutionary Stages Comparison */}
      <div className="mb-14">
        <h2 className="text-xl font-bold font-mono text-slate-200 mb-6 flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-400" />
          Evolutionary Roadmap (Stages 1 through 10)
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Stage 1 */}
          <div className="bg-[#0f1422] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between opacity-80">
            <div>
              <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-mono font-bold text-slate-200 text-xs">Stage 1</h4>
              <p className="text-[10px] text-slate-400 font-mono mb-2">Single Agent</p>
              <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                <div>• Static Analysis</div>
                <div>• Explanations</div>
                <div>• Bug Fixes</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800">
              ✓ Completed
            </span>
          </div>

          {/* Stage 2 */}
          <div className="bg-[#0f1422] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between opacity-80">
            <div>
              <div className="w-7 h-7 rounded bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-mono font-bold text-slate-200 text-xs">Stage 2</h4>
              <p className="text-[10px] text-slate-400 font-mono mb-2">Agent + Execution</p>
              <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                <div>• Subprocess Sandbox</div>
                <div>• stdout/stderr Feedback</div>
                <div>• Self-Correction</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800">
              ✓ Completed
            </span>
          </div>

          {/* Stage 3 */}
          <div className="bg-[#0f1422] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between opacity-80">
            <div>
              <div className="w-7 h-7 rounded bg-purple-950/50 flex items-center justify-center text-purple-400 mb-2">
                <Users className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-mono font-bold text-slate-200 text-xs">Stage 3</h4>
              <p className="text-[10px] text-purple-400 font-mono mb-2">5-Agent System</p>
              <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                <div>• Manager (Orchestrator)</div>
                <div>• Analyzer / Fixer</div>
                <div>• Tester / Reviewer</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800">
              ✓ Completed
            </span>
          </div>

          {/* Stage 4 */}
          <div className="bg-[#0f1422] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between opacity-80">
            <div>
              <div className="w-7 h-7 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                <Server className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-mono font-bold text-slate-200 text-xs">Stage 4</h4>
              <p className="text-[10px] text-emerald-400 font-mono mb-2">Multi-Agent + MCP</p>
              <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                <div>• Standardized Protocol</div>
                <div>• 4 Developer Tools</div>
                <div>• Real-time Audit</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800">
              ✓ Completed
            </span>
          </div>

          {/* Stage 5 */}
          <div className="bg-[#0f1422] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between opacity-80">
            <div>
              <div className="w-7 h-7 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 mb-2">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-mono font-bold text-slate-200 text-xs">Stage 5</h4>
              <p className="text-[10px] text-purple-400 font-mono mb-2">Transformer Lab</p>
              <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                <div>• Built from Scratch</div>
                <div>• PyTorch CPU Training</div>
                <div>• Causal Self-Attention</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800">
              ✓ Completed
            </span>
          </div>

          {/* Stage 6 */}
          <div className="bg-[#0f1422] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between opacity-80">
            <div>
              <div className="w-7 h-7 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2">
                <Cpu className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-mono font-bold text-slate-200 text-xs">Stage 6</h4>
              <p className="text-[10px] text-cyan-400 font-mono mb-2">Hybrid Routing</p>
              <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                <div>• Multi-tier Router</div>
                <div>• Gemini &harr; Local Model</div>
                <div>• Offline Determinism</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800">
              ✓ Completed
            </span>
          </div>

          {/* Stage 7 */}
          <div className="bg-[#0f1422] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between opacity-80">
            <div>
              <div className="w-7 h-7 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-mono font-bold text-slate-200 text-xs">Stage 7</h4>
              <p className="text-[10px] text-emerald-400 font-mono mb-2">Production Ops</p>
              <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                <div>• Tiered Rate Limiting</div>
                <div>• JWT Auth Middleware</div>
                <div>• Request Tracing</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800">
              ✓ Completed
            </span>
          </div>

          {/* Stage 8 */}
          <div className="bg-[#0f1422] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between opacity-80">
            <div>
              <div className="w-7 h-7 rounded bg-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2">
                <FolderGit2 className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-mono font-bold text-slate-200 text-xs">Stage 8</h4>
              <p className="text-[10px] text-cyan-400 font-mono mb-2">Repository Eng.</p>
              <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                <div>• Multi-file Ingestion</div>
                <div>• Bug Reproduction</div>
                <div>• 0-Regression Checks</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800">
              ✓ Completed
            </span>
          </div>

          {/* Stage 9 */}
          <div className="bg-[#0f1422] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between opacity-80">
            <div>
              <div className="w-7 h-7 rounded bg-amber-500/20 flex items-center justify-center text-amber-400 mb-2">
                <Flame className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-mono font-bold text-slate-200 text-xs">Stage 9</h4>
              <p className="text-[10px] text-amber-400 font-mono mb-2">Continuous Maint.</p>
              <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                <div>• Signal Monitoring</div>
                <div>• Change Hotspots</div>
                <div>• Test Run History</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 mt-3 pt-2 border-t border-slate-800">
              ✓ Completed
            </span>
          </div>

          {/* Stage 10 */}
          <div className="bg-[#111726] border-2 border-indigo-500 rounded-xl p-3.5 flex flex-col justify-between shadow-xl shadow-indigo-950/40 relative">
            <div className="absolute -top-2 left-2">
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-slate-950 font-mono text-[8px] font-bold tracking-wider uppercase">
                ACTIVE OPERATIONAL
              </span>
            </div>
            <div>
              <div className="w-7 h-7 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2 mt-1">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <h4 className="font-mono font-bold text-slate-100 text-xs">Stage 10</h4>
              <p className="text-[10px] text-indigo-400 font-mono mb-2">Predictive Eng.</p>
              <div className="text-[10px] font-mono text-slate-300 space-y-0.5">
                <div>• Trend Analysis</div>
                <div>• Evidence Correlation</div>
                <div>• Preventive Actions</div>
              </div>
            </div>
            <span className="text-[9px] font-mono text-indigo-400 font-bold mt-3 pt-1 border-t border-slate-800">
              ● Active &amp; Verified
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
