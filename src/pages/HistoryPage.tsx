import React, { useState, useMemo } from 'react';
import {
  History,
  Trash2,
  Search,
  Filter,
  Calendar,
  ArrowUpRight,
  Terminal,
  ShieldCheck,
  Users,
  Server,
} from 'lucide-react';
import { DebugSession } from '../types';
import { storageService } from '../services/storage';

interface HistoryPageProps {
  onOpenSession: (session: DebugSession) => void;
  onRefreshCount: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenSession, onRefreshCount }) => {
  const [sessions, setSessions] = useState<DebugSession[]>(() => storageService.getSessions());
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('ALL');

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const matchesLang =
        languageFilter === 'ALL' || session.language.toUpperCase() === languageFilter.toUpperCase();
      const q = searchQuery.toLowerCase();
      const codeText = 'originalCode' in session ? session.originalCode : session.code;
      const matchesSearch =
        !q ||
        codeText.toLowerCase().includes(q) ||
        (session.description && session.description.toLowerCase().includes(q)) ||
        (session.debuggingResult?.summary &&
          session.debuggingResult.summary.toLowerCase().includes(q)) ||
        session.language.toLowerCase().includes(q);
      return matchesLang && matchesSearch;
    });
  }, [sessions, searchQuery, languageFilter]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storageService.deleteSession(id);
    setSessions(storageService.getSessions());
    onRefreshCount();
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all debugging history?')) {
      storageService.clearHistory();
      setSessions([]);
      onRefreshCount();
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
              <History className="w-4 h-4 text-purple-400" />
            </div>
            <h1 className="text-xl font-bold font-mono text-slate-100">
              Multi-Agent Debugging History
            </h1>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Stored locally in your browser with multi-agent timeline steps, reviewer approvals, and sandbox metrics.
          </p>
        </div>

        {sessions.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      {sessions.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-[#111726] border border-slate-800 p-3 rounded-xl">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code snippets, errors, or descriptions..."
              className="w-full bg-[#0b0f17] border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500 font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="bg-[#0b0f17] border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none font-mono cursor-pointer"
            >
              <option value="ALL">All Languages</option>
              <option value="Python">Python</option>
              <option value="Java">Java</option>
              <option value="JavaScript">JavaScript</option>
              <option value="TypeScript">TypeScript</option>
              <option value="C">C</option>
              <option value="C++">C++</option>
              <option value="SQL">SQL</option>
              <option value="HTML">HTML</option>
              <option value="CSS">CSS</option>
            </select>
          </div>
        </div>
      )}

      {/* Session list or Empty State */}
      {filteredSessions.length === 0 ? (
        <div className="bg-[#111726]/40 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <History className="w-12 h-12 text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-slate-300 font-mono mb-1">
            {sessions.length === 0 ? 'No Multi-Agent Sessions Yet' : 'No Matching Sessions Found'}
          </h3>
          <p className="text-xs text-slate-400 font-sans max-w-sm">
            {sessions.length === 0
              ? 'When you run the 5-Agent Debugger, your sessions, reviewer decisions, and timeline records will appear here.'
              : 'Try clearing your search query or language filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSessions.map((session) => {
            const isError = session.debuggingResult?.status === 'error_found';
            const isWarning = session.debuggingResult?.status === 'warning';
            const codeText = 'originalCode' in session ? session.originalCode : session.code;
            const exec = session.debuggingResult?.execution || ('test' in session ? session.test : undefined);
            const rev = session.debuggingResult?.review || ('review' in session ? session.review : undefined);

            return (
              <div
                key={session.id}
                onClick={() => onOpenSession(session)}
                className="bg-[#111726] border border-slate-800 hover:border-purple-500/50 rounded-xl p-4 transition-all duration-200 cursor-pointer shadow-md group flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800/80">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-300">
                        {session.language}
                      </span>

                      <span
                        className={`font-mono text-[11px] px-2 py-0.5 rounded border uppercase font-medium ${
                          isError
                            ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                            : isWarning
                            ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                            : 'bg-emerald-950/60 border-emerald-800/60 text-emerald-300'
                        }`}
                      >
                        {session.debuggingResult?.status?.replace('_', ' ') || 'ANALYSIS'}
                      </span>

                      {/* Reviewer Tag */}
                      {rev && (
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                            rev.approved
                              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60'
                              : 'bg-amber-950/90 text-amber-300 border-amber-700/60'
                          }`}
                        >
                          <ShieldCheck className="w-2.5 h-2.5" />
                          {rev.approved ? 'REVIEW: APPROVED' : 'REVIEW: REVISED'}
                        </span>
                      )}

                      {/* Tester Tag */}
                      {exec && (
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded border flex items-center gap-1 ${
                            exec.attempted
                              ? exec.success
                                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700/60'
                                : 'bg-rose-950/90 text-rose-300 border-rose-700/60'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          <Terminal className="w-2.5 h-2.5" />
                          {exec.attempted ? (exec.success ? 'TEST OK' : 'TEST FAIL') : 'STATIC'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatTimestamp(session.timestamp)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(session.id, e)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-xs text-slate-200 line-clamp-2 mb-3 font-sans leading-relaxed">
                    {session.debuggingResult?.summary}
                  </p>

                  {/* Code snippet preview */}
                  <div className="bg-[#090d14] border border-slate-800/70 rounded-lg p-2.5 mb-3 font-mono text-xs text-slate-400 max-h-24 overflow-hidden relative">
                    <pre className="line-clamp-3 whitespace-pre-wrap">{codeText}</pre>
                    <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#090d14] to-transparent pointer-events-none"></div>
                  </div>
                </div>

                {/* Footer action */}
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Server className="w-3 h-3 text-emerald-400" />
                    5 Agents • MCP Connected
                  </span>
                  <span className="text-cyan-400 group-hover:text-cyan-300 flex items-center gap-1">
                    Open in Workspace <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
