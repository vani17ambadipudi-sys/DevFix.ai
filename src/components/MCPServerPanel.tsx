import React, { useState } from 'react';
import {
  Server,
  Terminal,
  FileCode,
  FolderTree,
  BookOpen,
  CheckCircle2,
  Activity,
  ChevronDown,
  ChevronUp,
  Play,
  Shield,
  Layers,
  ArrowRight,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { MCPActivityEvent } from '../../mcp-server/types';
import { mcpClient } from '../services/mcpClient';

interface MCPServerPanelProps {
  activityLog: MCPActivityEvent[];
  serverStatus?: 'Connected' | 'Disconnected';
  onFileSelect?: (filePath: string) => void;
}

const MCP_TOOLS = [
  {
    name: 'run_code',
    title: 'Code Runner',
    description: 'Safely execute supported source code (Python, JS, TS) in an isolated sandbox subprocess.',
    icon: Terminal,
    color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/50',
    primaryCaller: 'Tester Agent',
  },
  {
    name: 'read_project_file',
    title: 'Project File Reader',
    description: 'Inspect permitted source files with strict path protection forbidding (..) traversal and secrets.',
    icon: FileCode,
    color: 'text-cyan-400 bg-cyan-950/40 border-cyan-800/50',
    primaryCaller: 'Analyzer / Reviewer',
  },
  {
    name: 'inspect_project',
    title: 'Project Inspector',
    description: 'Provide a safe summary of the project structure and permitted source code layout.',
    icon: FolderTree,
    color: 'text-purple-400 bg-purple-950/40 border-purple-800/50',
    primaryCaller: 'Analyzer Agent',
  },
  {
    name: 'search_documentation',
    title: 'Documentation Search',
    description: 'Search approved official programming and debugging documentation across 9 languages.',
    icon: BookOpen,
    color: 'text-amber-400 bg-amber-950/40 border-amber-800/50',
    primaryCaller: 'Fixer Agent',
  },
];

export const MCPServerPanel: React.FC<MCPServerPanelProps> = ({
  activityLog,
  serverStatus = 'Connected',
  onFileSelect,
}) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'activity' | 'tester'>('tools');
  const [selectedTool, setSelectedTool] = useState<string>('inspect_project');
  const [toolInput, setToolInput] = useState<string>('src');
  const [toolResult, setToolResult] = useState<any>(null);
  const [isRunningTool, setIsRunningTool] = useState(false);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const handleRunManualTool = async () => {
    setIsRunningTool(true);
    setToolResult(null);

    try {
      if (selectedTool === 'inspect_project') {
        const res = await mcpClient.inspectProject({ subDirectory: toolInput || 'src' }, 'User (Manual Test)');
        setToolResult(res);
      } else if (selectedTool === 'read_project_file') {
        const res = await mcpClient.readProjectFile({ path: toolInput || 'src/types/index.ts' }, 'User (Manual Test)');
        setToolResult(res);
      } else if (selectedTool === 'search_documentation') {
        const res = await mcpClient.searchDocumentation({ query: toolInput || 'Python list index', technology: 'Python' }, 'User (Manual Test)');
        setToolResult(res);
      } else if (selectedTool === 'run_code') {
        const res = await mcpClient.runCode({ language: 'Python', code: toolInput || 'print("Hello from MCP run_code!")' }, 'User (Manual Test)');
        setToolResult(res);
      }
    } catch (err: any) {
      setToolResult({ error: err?.message || String(err) });
    } finally {
      setIsRunningTool(false);
    }
  };

  return (
    <div className="bg-[#111726] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      {/* Header with Server Status */}
      <div className="p-4 bg-[#131b2e] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold font-mono uppercase tracking-wider text-slate-100">
                DevFix MCP Server
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-600/50 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Status: {serverStatus}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Model Context Protocol • 4 Developer Tools Registered
            </p>
          </div>
        </div>

        {/* Sub-Tabs: Tools, Activity, Manual Testing */}
        <div className="flex items-center gap-1 bg-[#0b0f17] p-1 rounded-lg border border-slate-800 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'tools'
                ? 'bg-slate-800 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tools ({MCP_TOOLS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1.5 ${
              activeTab === 'activity'
                ? 'bg-slate-800 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3 h-3 text-cyan-400" />
            Activity
            {activityLog.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-300 text-[10px]">
                {activityLog.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tester')}
            className={`px-2.5 py-1 rounded transition-colors ${
              activeTab === 'tester'
                ? 'bg-slate-800 text-purple-300 font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tool Inspector
          </button>
        </div>
      </div>

      {/* Tab 1: Available MCP Tools List */}
      {activeTab === 'tools' && (
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MCP_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <div
                  key={tool.name}
                  className="bg-[#0b0f17] border border-slate-800/90 rounded-xl p-3 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg border ${tool.color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-mono font-bold text-xs text-slate-200">
                          {tool.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        ✓ Connected
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed mb-3">
                      {tool.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Used by: <span className="text-slate-300">{tool.primaryCaller}</span></span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTool(tool.name);
                        setActiveTab('tester');
                        if (tool.name === 'inspect_project') setToolInput('src');
                        if (tool.name === 'read_project_file') setToolInput('src/types/index.ts');
                        if (tool.name === 'search_documentation') setToolInput('Python list index');
                        if (tool.name === 'run_code') setToolInput('print("Testing MCP sandbox")');
                      }}
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      Inspect →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 rounded-xl bg-black/40 border border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Security: Path protection enforced • Secret scrubbing active • 5s execution timeout
            </span>
            <span className="text-slate-500 hidden sm:inline">MCP Spec v1.0.0</span>
          </div>
        </div>
      )}

      {/* Tab 2: MCP Activity Panel (Chronological Event Stream) */}
      {activeTab === 'activity' && (
        <div className="p-4">
          <div className="text-xs font-mono text-slate-400 mb-2 flex items-center justify-between">
            <span>Recent Agent-to-MCP Invocations</span>
            <span className="text-[10px] text-slate-500">Live Timestamped Audit</span>
          </div>

          {activityLog.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-slate-500 bg-[#0b0f17] rounded-xl border border-slate-800">
              No MCP tool events yet. Run the 5-Agent debugger or use the Tool Inspector to invoke tools.
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
              {activityLog.slice(0, 15).map((ev) => {
                const isExpanded = expandedLog === ev.id;
                const isSuccess = ev.action === 'completed';
                const isFail = ev.action === 'failed';
                const isReq = ev.action === 'requested';

                return (
                  <div
                    key={ev.id}
                    onClick={() => setExpandedLog(isExpanded ? null : ev.id)}
                    className="p-2.5 rounded-lg bg-[#0b0f17] border border-slate-800/90 text-xs font-mono hover:border-slate-700 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500 shrink-0">{ev.timestamp}</span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-purple-300 font-semibold text-[10px]">
                          {ev.requesterAgent}
                        </span>
                        <span className="text-slate-200 font-medium">
                          {ev.message}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          isSuccess
                            ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-700/40'
                            : isFail
                            ? 'text-rose-400 bg-rose-950/80 border border-rose-700/40'
                            : 'text-cyan-400 bg-cyan-950/80 border border-cyan-700/40'
                        }`}
                      >
                        {ev.action}
                      </span>
                    </div>

                    {isExpanded && ev.details && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
                        <pre className="whitespace-pre-wrap font-mono bg-black/40 p-2 rounded text-slate-300">
                          {ev.details}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Manual Tool Inspector & Verification Playground */}
      {activeTab === 'tester' && (
        <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-purple-400" />
              Manual Tool Invocation
            </span>
            <span className="text-slate-500">Test MCP Server responses directly</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <select
              value={selectedTool}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedTool(val);
                if (val === 'inspect_project') setToolInput('src');
                if (val === 'read_project_file') setToolInput('src/types/index.ts');
                if (val === 'search_documentation') setToolInput('Python list indexing');
                if (val === 'run_code') setToolInput('print(10 + 20)');
                setToolResult(null);
              }}
              className="bg-[#0b0f17] border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
            >
              <option value="inspect_project">inspect_project</option>
              <option value="read_project_file">read_project_file</option>
              <option value="search_documentation">search_documentation</option>
              <option value="run_code">run_code</option>
            </select>

            <div className="sm:col-span-2">
              <input
                type="text"
                value={toolInput}
                onChange={(e) => setToolInput(e.target.value)}
                placeholder={
                  selectedTool === 'read_project_file'
                    ? 'File path, e.g. src/types/index.ts'
                    : selectedTool === 'search_documentation'
                    ? 'Search query, e.g. Python IndexError'
                    : selectedTool === 'run_code'
                    ? 'Code snippet'
                    : 'Sub-directory, e.g. src'
                }
                className="w-full bg-[#0b0f17] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>

            <button
              type="button"
              onClick={handleRunManualTool}
              disabled={isRunningTool}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-lg text-xs font-mono font-semibold transition-all disabled:opacity-50"
            >
              {isRunningTool ? (
                <span>Executing...</span>
              ) : (
                <>
                  <Play className="w-3 h-3" />
                  <span>Execute Tool</span>
                </>
              )}
            </button>
          </div>

          {/* Tool Result Preview */}
          {toolResult && (
            <div className="bg-[#090d14] border border-slate-800 rounded-xl p-3 font-mono text-xs max-h-56 overflow-auto">
              <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold mb-1 flex items-center justify-between">
                <span>MCP Result:</span>
                <span className="text-slate-500">Structured JSON</span>
              </div>
              <pre className="text-slate-200 whitespace-pre-wrap text-[11px] leading-5">
                {JSON.stringify(toolResult, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
