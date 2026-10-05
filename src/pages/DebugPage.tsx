import React, { useState, useEffect } from 'react';
import { CodeEditor } from '../components/CodeEditor';
import { DebugResultView } from '../components/DebugResultView';
import { FollowUpChat } from '../components/FollowUpChat';
import { AgentTimeline } from '../components/AgentTimeline';
import { MCPServerPanel } from '../components/MCPServerPanel';
import {
  AgentStep,
  DebuggingResult,
  FollowUpMessage,
  SupportedLanguage,
  DebugSession,
  MultiAgentDebugSession,
  MCPActivityEvent,
} from '../types';
import { geminiService } from '../services/geminiService';
import { storageService } from '../services/storage';
import { mcpClient } from '../services/mcpClient';
import { AlertCircle, Server, Workflow } from 'lucide-react';

interface DebugPageProps {
  initialSession?: DebugSession | null;
  onSessionSaved: () => void;
}

const DEFAULT_TIMELINE: AgentStep[] = [
  { id: '1', agent: 'Manager', status: 'Waiting', timestamp: '--:--', summary: 'Awaiting user input' },
  { id: '2', agent: 'Analyzer', status: 'Waiting', timestamp: '--:--', summary: 'Ready to scan code' },
  { id: '3', agent: 'Fixer', status: 'Waiting', timestamp: '--:--', summary: 'Ready to generate fix' },
  { id: '4', agent: 'Tester', status: 'Waiting', timestamp: '--:--', summary: 'Ready to test via MCP run_code' },
  { id: '5', agent: 'Reviewer', status: 'Waiting', timestamp: '--:--', summary: 'Ready to audit solution' },
];

export const DebugPage: React.FC<DebugPageProps> = ({ initialSession, onSessionSaved }) => {
  const [language, setLanguage] = useState<SupportedLanguage>(
    initialSession?.language || 'Python'
  );
  const [code, setCode] = useState<string>(
    initialSession
      ? 'originalCode' in initialSession
        ? initialSession.originalCode
        : initialSession.code
      : `# Welcome to DevFix AI Stage 4: Multi-Agent + MCP System\n# 5 Specialized Cooperating Agents connected to MCP Server:\n# Manager -> Analyzer -> Fixer -> Tester (MCP run_code) -> Reviewer\n\nnumbers = [10, 20, 30]\n\nprint(numbers[5])`
  );
  const [description, setDescription] = useState<string>(
    initialSession?.description || ''
  );
  const [result, setResult] = useState<DebuggingResult | null>(
    initialSession?.debuggingResult || null
  );
  const [timeline, setTimeline] = useState<AgentStep[]>(
    initialSession?.debuggingResult?.agentTimeline || DEFAULT_TIMELINE
  );
  const [mcpActivity, setMcpActivity] = useState<MCPActivityEvent[]>(() =>
    mcpClient.getActivityLog()
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeStep, setActiveStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [followUpMessages, setFollowUpMessages] = useState<FollowUpMessage[]>([]);

  // Subscribe to live MCP tool events & load initial activity
  useEffect(() => {
    mcpClient.fetchActivityLog().then((logs) => {
      if (logs && logs.length > 0) setMcpActivity(logs);
    });

    const unsubscribe = mcpClient.subscribeToActivity(() => {
      setMcpActivity([...mcpClient.getActivityLog()]);
    });
    return () => unsubscribe();
  }, []);

  // Update when initialSession changes (e.g. opened from history)
  useEffect(() => {
    if (initialSession) {
      setLanguage(initialSession.language);
      const codeVal =
        'originalCode' in initialSession
          ? initialSession.originalCode
          : initialSession.code;
      setCode(codeVal);
      setDescription(initialSession.description || '');
      setResult(initialSession.debuggingResult);
      setTimeline(initialSession.debuggingResult?.agentTimeline || DEFAULT_TIMELINE);
      if ('mcpActivity' in initialSession && Array.isArray(initialSession.mcpActivity)) {
        setMcpActivity(initialSession.mcpActivity);
      }
      setFollowUpMessages([]);
      setErrorMessage(null);
    }
  }, [initialSession]);

  const handleClear = () => {
    setCode('');
    setDescription('');
    setResult(null);
    setTimeline(DEFAULT_TIMELINE);
    setFollowUpMessages([]);
    setErrorMessage(null);
    setActiveStep('');
  };

  const handleApplyCode = (newCode: string) => {
    setCode(newCode);
  };

  const handleFileSelect = async (filePath: string) => {
    try {
      const fileData = await mcpClient.readProjectFile({ path: filePath }, 'User (File Explorer)');
      setCode(fileData.content);
      if (filePath.endsWith('.py')) setLanguage('Python');
      else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) setLanguage('TypeScript');
      else if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) setLanguage('JavaScript');
      else if (filePath.endsWith('.java')) setLanguage('Java');
      else if (filePath.endsWith('.cpp') || filePath.endsWith('.c')) setLanguage('C++');
      else if (filePath.endsWith('.sql')) setLanguage('SQL');
      else if (filePath.endsWith('.html')) setLanguage('HTML');
      else if (filePath.endsWith('.css')) setLanguage('CSS');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to read project file.');
    }
  };

  const handleDebugAndTest = async (testExecution = true) => {
    if (!code.trim()) {
      setErrorMessage('Please provide code to analyze before launching the multi-agent pipeline.');
      return;
    }

    setErrorMessage(null);
    setIsAnalyzing(true);
    setActiveStep('Manager Agent dispatching pipeline with MCP tools...');
    setTimeline(DEFAULT_TIMELINE.map((t) => ({ ...t, status: 'Waiting' })));

    try {
      const debugResult = await geminiService.debugCode(
        {
          language,
          code,
          description,
          testExecution,
        },
        (updatedTimeline) => {
          setTimeline(updatedTimeline);
        },
        (step) => {
          setActiveStep(step);
        },
        (updatedActivity) => {
          setMcpActivity(updatedActivity);
        }
      );

      setResult(debugResult);
      if (debugResult.agentTimeline) {
        setTimeline(debugResult.agentTimeline);
      }
      if (debugResult.mcpActivity) {
        setMcpActivity(debugResult.mcpActivity);
      }
      setFollowUpMessages([]);

      // Save to localStorage history with Stage 4 Multi-Agent + MCP metadata
      const newSession: MultiAgentDebugSession = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        language,
        originalCode: code,
        description: description.trim() || undefined,
        analysis: debugResult.analysis || {
          status: debugResult.status,
          summary: debugResult.summary,
          errorTypes: debugResult.errorTypes as string[],
          problems: debugResult.problems,
          recommendations: [],
        },
        fix: debugResult.fix || {
          correctedCode: debugResult.correctedCode,
          changes: debugResult.changes,
          explanation: debugResult.summary,
        },
        test: debugResult.test || {
          attempted: debugResult.execution?.attempted ?? false,
          success: debugResult.execution?.success ?? false,
          stdout: debugResult.execution?.stdout ?? '',
          stderr: debugResult.execution?.stderr ?? '',
          exitCode: debugResult.execution?.exitCode ?? 0,
          executionTime: debugResult.execution?.executionTime ?? 0,
          attempt: debugResult.attempts ?? 1,
        },
        review: debugResult.review || {
          approved: debugResult.execution?.success ?? true,
          summary: 'Review completed.',
          remainingIssues: [],
          recommendations: [],
        },
        attempts: debugResult.attempts ?? 1,
        agentTimeline: debugResult.agentTimeline || timeline,
        debuggingResult: debugResult,
        mcpActivity: debugResult.mcpActivity || mcpActivity,
        mcpToolsUsed: debugResult.mcpToolsUsed || ['run_code', 'search_documentation', 'inspect_project'],
      };

      storageService.saveSession(newSession as any);
      onSessionSaved();
    } catch (err: any) {
      console.error('Multi-agent pipeline error:', err);
      setErrorMessage(err?.message || 'Failed to complete multi-agent debugging.');
    } finally {
      setIsAnalyzing(false);
      setActiveStep('');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Workspace Top Notice */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-[#111726]/80 border border-slate-800/80 rounded-xl px-4 py-3 text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200">Stage 4: Multi-Agent + MCP Workspace</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-300">
            Agents ➔ MCP Client ➔ DevFix MCP Server (run_code, read_project_file, inspect_project, search_documentation)
          </span>
        </div>
        <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          MCP Server Connected • 5 Specialized Agents
        </div>
      </div>

      {/* Main Grid: Code Editor on Left, Agent Timeline & Result on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Editor & Controls */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <CodeEditor
            language={language}
            setLanguage={setLanguage}
            code={code}
            setCode={setCode}
            description={description}
            setDescription={setDescription}
            onDebugAndTest={handleDebugAndTest}
            onClear={handleClear}
            isAnalyzing={isAnalyzing}
            activeStep={activeStep}
          />

          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-sm flex items-start gap-3 animate-shake font-sans">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold font-mono text-xs uppercase tracking-wider mb-1">
                  Multi-Agent Pipeline Error
                </p>
                <p>{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Persistent Agent Timeline Component */}
          <AgentTimeline
            timeline={timeline}
            isAnalyzing={isAnalyzing}
            analysis={result?.analysis}
            fix={result?.fix}
            test={result?.test}
            review={result?.review}
          />

          {/* DevFix MCP Server Status & Live Activity Panel */}
          <MCPServerPanel
            activityLog={mcpActivity}
            serverStatus="Connected"
            onFileSelect={handleFileSelect}
          />
        </div>

        {/* Right Column: Result or Placeholder */}
        <div className="lg:col-span-6 flex flex-col">
          {result ? (
            <>
              <DebugResultView result={result} onApplyCode={handleApplyCode} />
              <FollowUpChat
                language={language}
                originalCode={code}
                description={description}
                debuggingResult={result}
                messages={followUpMessages}
                setMessages={setFollowUpMessages}
              />
            </>
          ) : (
            <div className="bg-[#111726]/40 border border-dashed border-slate-800 rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center min-h-[440px]">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center mb-4 text-emerald-400 shadow-inner">
                <Server className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-slate-200 font-mono mb-2">
                Awaiting Multi-Agent + MCP Execution
              </h3>
              <p className="text-sm text-slate-400 max-w-md font-sans leading-relaxed mb-6">
                Click <span className="text-emerald-300 font-mono">Run 5-Agent Debugger</span>.
                The Manager Agent will orchestrate the Analyzer, Fixer, Tester (invoking MCP{' '}
                <code className="text-cyan-300">run_code</code>), and Reviewer agents with full
                MCP server tool integration.
              </p>

              <div className="grid grid-cols-2 gap-3 text-left w-full max-w-sm">
                <div className="bg-[#0b0f17] border border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold block mb-0.5">
                    MCP run_code
                  </span>
                  <p className="text-xs text-slate-400">
                    Tester agent invokes the standardized MCP tool for sandbox testing.
                  </p>
                </div>
                <div className="bg-[#0b0f17] border border-slate-800/80 p-3 rounded-xl">
                  <span className="text-[11px] font-mono text-cyan-400 font-semibold block mb-0.5">
                    MCP Tools
                  </span>
                  <p className="text-xs text-slate-400">
                    Standardized tools for documentation, file inspection, and sandbox execution.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
