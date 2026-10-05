import React from 'react';
import {
  Bug,
  History,
  Info,
  Workflow,
  Server,
  Sparkles,
  Activity,
  FolderGit2,
  TrendingUp,
} from 'lucide-react';

interface HeaderProps {
  activeTab:
    | 'debug'
    | 'repository'
    | 'transformer'
    | 'production'
    | 'predictive'
    | 'history'
    | 'about';
  setActiveTab: (
    tab:
      | 'debug'
      | 'repository'
      | 'transformer'
      | 'production'
      | 'predictive'
      | 'history'
      | 'about'
  ) => void;
  historyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  historyCount,
}) => {
  return (
    <header className="border-b border-slate-800/80 bg-[#0d121f]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Stage Badge */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveTab('debug')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Bug className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-100 tracking-tight font-mono">
                  DevFix<span className="text-cyan-400">.ai</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase bg-indigo-950/90 text-indigo-300 border border-indigo-500/60 shadow-sm">
                  <TrendingUp className="w-3 h-3 text-indigo-400" />
                  Stages 9 &amp; 10: Continuous &amp; Predictive Ops
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block font-mono">
                Multi-Agent &bull; Web Tech (HTML/CSS/JS) &bull; Continuous Quality &bull; Predictive Intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('debug')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'debug'
                ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Workflow className="w-4 h-4" />
            <span>Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('repository')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'repository'
                ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 border border-cyan-500/50 shadow-sm font-semibold'
                : 'text-cyan-400/80 hover:text-cyan-200 hover:bg-cyan-950/40'
            }`}
          >
            <FolderGit2 className="w-4 h-4 text-cyan-400" />
            <span>Repository Debugger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('predictive')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'predictive'
                ? 'bg-gradient-to-r from-indigo-950 to-cyan-950 text-indigo-300 border border-indigo-500/50 shadow-sm font-semibold'
                : 'text-indigo-400/90 hover:text-indigo-200 hover:bg-indigo-950/40'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <span>Quality &amp; Predictive Ops</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transformer')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'transformer'
                ? 'bg-gradient-to-r from-purple-900/80 to-indigo-900/80 text-purple-200 border border-purple-500/40 shadow-sm font-semibold'
                : 'text-purple-300/80 hover:text-purple-200 hover:bg-purple-950/40'
            }`}
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>Transformer Lab</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('production')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'production'
                ? 'bg-gradient-to-r from-emerald-950 to-cyan-950 text-emerald-300 border border-emerald-500/40 shadow-sm font-semibold'
                : 'text-emerald-400/80 hover:text-emerald-200 hover:bg-emerald-950/40'
            }`}
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Telemetry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>History</span>
            {historyCount > 0 && (
              <span className="ml-0.5 text-[10px] px-1.5 py-0.2 rounded-full bg-slate-700 text-slate-300 font-mono">
                {historyCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'about'
                ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30 shadow-sm font-semibold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>About</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
