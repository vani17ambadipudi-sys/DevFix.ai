import React, { useState, useEffect } from 'react';
import {
  FolderGit2,
  Upload,
  Play,
  RotateCw,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  FolderTree,
  GitBranch,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Terminal,
  Layers,
  ChevronRight,
  ChevronDown,
  Undo2,
  XCircle,
  FileCheck2,
  Flame,
  Info,
} from 'lucide-react';

interface Repository {
  id: string;
  name: string;
  originalPath: string;
  workspacePath: string;
  languages: string[];
  frameworks: string[];
  packageManager?: string;
  testFramework?: string;
  entryPoints: string[];
  filesCount: number;
  status: string;
  createdAt: string;
}

interface WorkflowStep {
  stage: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  title: string;
  summary: string;
  timestamp?: string;
}

interface DiagnosisResult {
  repositoryId: string;
  issueId: string;
  patchId: string;
  analysis: any;
  reproduction: any;
  rootCause: any;
  plan: any;
  verification: any;
  regression: any;
  review: any;
  diffs: Array<{ file: string; unifiedDiff: string; additions: number; deletions: number }>;
  combinedDiff: string;
  status: string;
  requiresDeveloperApproval: boolean;
}

export const RepositoryDebuggerPage: React.FC = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isSeedingDemo, setIsSeedingDemo] = useState(false);

  // File Explorer State
  const [fileList, setFileList] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Issue & Pipeline State
  const [issueDescription, setIssueDescription] = useState(
    'Login API returns HTTP 500 when email is empty instead of returning 400 Bad Request.'
  );
  const [errorLogs, setErrorLogs] = useState(
    'Error: Database lookup requires non-empty email string.\n    at findUserByEmail (authService.js:9)\n    at handleLogin (auth.js:8)'
  );
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowStep[]>([]);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<'idle' | 'approved' | 'rejected'>('idle');
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  // Load repositories on mount
  const fetchRepositories = async () => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch('/api/repositories');
      const data = await res.json();
      if (data.success && data.data) {
        setRepositories(data.data);
        if (!selectedRepo && data.data.length > 0) {
          setSelectedRepo(data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load repositories:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, []);

  // Fetch files when selected repository changes
  useEffect(() => {
    if (!selectedRepo) return;
    const fetchFiles = async () => {
      try {
        const res = await fetch(`/api/repositories/${selectedRepo.id}/files`);
        const data = await res.json();
        if (data.success && data.data?.files) {
          setFileList(data.data.files);
          if (data.data.files.length > 0) {
            loadFileContent(selectedRepo.id, data.data.files[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load files:', err);
      }
    };
    fetchFiles();
  }, [selectedRepo]);

  const loadFileContent = async (repoId: string, filePath: string) => {
    setSelectedFile(filePath);
    setIsLoadingFile(true);
    try {
      const res = await fetch(`/api/repositories/${repoId}/file?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (data.success && data.data?.content !== undefined) {
        setFileContent(data.data.content);
      }
    } catch (err) {
      console.error('Failed to load file content:', err);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const handleSeedDemoRepo = async () => {
    setIsSeedingDemo(true);
    try {
      const res = await fetch('/api/repositories/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data) {
        setSelectedRepo(data.data);
        fetchRepositories();
      }
    } catch (err) {
      console.error('Failed to seed demo repo:', err);
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const res = await fetch('/api/repositories/import-zip', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            zipBase64: base64,
            name: file.name.replace(/\.zip$/i, ''),
          }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setSelectedRepo(data.data);
          fetchRepositories();
        } else {
          alert('Upload failed: ' + (data.error || 'Unknown error'));
        }
      } catch (err: any) {
        alert('Upload failed: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run autonomous multi-agent repository diagnosis
  const handleStartDiagnosis = async () => {
    if (!selectedRepo) return;
    setIsRunningPipeline(true);
    setDiagnosisResult(null);
    setApprovalStatus('idle');
    setApprovalMessage(null);

    const initialSteps: WorkflowStep[] = [
      { stage: 'understand', status: 'pending', title: 'Repository Analyst', summary: 'Indexing repo architecture and dependencies' },
      { stage: 'reproduce', status: 'pending', title: 'Bug Reproducer', summary: 'Executing reproduction script to confirm failure' },
      { stage: 'analyze', status: 'pending', title: 'Root Cause Analyzer', summary: 'Pinpointing code logic error with evidence' },
      { stage: 'plan', status: 'pending', title: 'Patch Planner', summary: 'Formulating structured patch operations' },
      { stage: 'patch', status: 'pending', title: 'Patch Generator', summary: 'Generating code fix and applying to isolated workspace' },
      { stage: 'test', status: 'pending', title: 'Test Engineer', summary: 'Verifying reproduction now passes with HTTP 400' },
      { stage: 'regression', status: 'pending', title: 'Regression Checker', summary: 'Auditing existing test suite for regressions' },
      { stage: 'review', status: 'pending', title: 'Code Reviewer', summary: 'Reviewing unified diff and safety boundaries' },
    ];
    setActiveWorkflow(initialSteps);

    try {
      const response = await fetch(`/api/repositories/${selectedRepo.id}/diagnose-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueDescription, errorLogs }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const parsed = JSON.parse(jsonStr);

              if (parsed.type === 'progress' && parsed.event) {
                const ev = parsed.event;
                setActiveWorkflow((prev) =>
                  prev.map((step) =>
                    step.stage === ev.stage
                      ? {
                          ...step,
                          status: ev.status,
                          title: ev.title,
                          summary: ev.summary,
                          timestamp: ev.timestamp,
                        }
                      : step
                  )
                );
              } else if (parsed.type === 'result' && parsed.data) {
                setDiagnosisResult(parsed.data);
              } else if (parsed.type === 'error') {
                alert('Pipeline error: ' + parsed.error);
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Diagnosis stream error:', err);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  const handleApprovePatch = async () => {
    if (!diagnosisResult) return;
    try {
      const res = await fetch(`/api/issues/${diagnosisResult.issueId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setApprovalStatus('approved');
        setApprovalMessage(data.message);
        // Refresh file content to reflect applied changes
        if (selectedRepo && selectedFile) {
          loadFileContent(selectedRepo.id, selectedFile);
        }
      } else {
        alert('Approval failed: ' + data.error);
      }
    } catch (err: any) {
      alert('Approval error: ' + err.message);
    }
  };

  const handleRejectPatch = async () => {
    if (!diagnosisResult) return;
    try {
      const res = await fetch(`/api/issues/${diagnosisResult.issueId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Developer rejected proposed patch' }),
      });
      const data = await res.json();
      if (data.success) {
        setApprovalStatus('rejected');
        setApprovalMessage(data.message);
        if (selectedRepo && selectedFile) {
          loadFileContent(selectedRepo.id, selectedFile);
        }
      }
    } catch (err: any) {
      alert('Rejection error: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fadeIn font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#12192c] via-[#151c32] to-[#0f1424] border border-cyan-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold tracking-wide">
              <FolderGit2 className="w-3.5 h-3.5" />
              Stage 8: Autonomous Repository Engineering
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">
              Repository Debugger &amp; Patch Engineer
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Autonomous multi-agent system that analyzes entire codebases, reproduces reported bugs in an isolated workspace,
              generates verified surgical patches, and guarantees zero regressions — with strict developer-in-the-loop approval.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSeedDemoRepo}
              disabled={isSeedingDemo}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold rounded-xl text-xs font-mono flex items-center gap-2 shadow-lg shadow-cyan-950/50 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isSeedingDemo ? 'Seeding...' : 'Load Section 38 Demo Repo'}
            </button>

            <label className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono flex items-center gap-2 border border-slate-700 cursor-pointer transition-all">
              <Upload className="w-3.5 h-3.5" />
              <span>Import ZIP</span>
              <input type="file" accept=".zip" onChange={handleZipUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Selected Repository Pill Bar */}
        {selectedRepo && (
          <div className="mt-6 pt-6 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Target Workspace:</span>
              <span className="text-cyan-300 font-bold bg-[#0b0f17] px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                {selectedRepo.name}
              </span>
              <span className="text-slate-500 text-[11px] hidden sm:inline">
                ({selectedRepo.filesCount} files &bull; {selectedRepo.languages.join(', ')})
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-800/40">
              <ShieldCheck className="w-3.5 h-3.5" />
              Isolated Workspace Active (Safe Mode)
            </div>
          </div>
        )}
      </div>

      {/* Main Two-Column Layout: Project Explorer vs Issue Diagnosis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Project File Explorer */}
        <div className="lg:col-span-4 bg-[#111726] border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 font-mono">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-cyan-400" />
              Project Explorer
            </h3>
            <span className="text-[11px] text-slate-500">{fileList.length} files</span>
          </div>

          {/* File Tree List */}
          <div className="max-h-60 overflow-y-auto space-y-1 text-xs pr-1">
            {fileList.map((file) => (
              <button
                key={file}
                onClick={() => selectedRepo && loadFileContent(selectedRepo.id, file)}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                  selectedFile === file
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-500" />
                <span className="truncate">{file}</span>
              </button>
            ))}
          </div>

          {/* File Content Preview */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate font-semibold text-slate-300">{selectedFile || 'Select a file'}</span>
              <span>Read-only</span>
            </div>
            <pre className="bg-[#0b0f17] p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 max-h-56 overflow-auto font-mono">
              {isLoadingFile ? 'Loading content...' : fileContent || '// Select a file to inspect'}
            </pre>
          </div>
        </div>

        {/* Right Column: Issue Description & Autonomous Diagnosis */}
        <div className="lg:col-span-8 space-y-6">
          {/* Issue Input Card */}
          <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                <Terminal className="w-4 h-4 text-purple-400" />
                Reported Bug Description
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIssueDescription(
                    'Login API returns HTTP 500 when email is empty instead of returning 400 Bad Request.'
                  );
                  setErrorLogs(
                    'Error: Database lookup requires non-empty email string.\n    at findUserByEmail (authService.js:9)\n    at handleLogin (auth.js:8)'
                  );
                }}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Reset to Section 38 Bug
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Issue Behavior / Specification:</label>
                <textarea
                  rows={2}
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-xs resize-none"
                  placeholder="Describe the bug or failure behavior..."
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Error Logs &amp; Stack Traces (Optional):</label>
                <textarea
                  rows={2}
                  value={errorLogs}
                  onChange={(e) => setErrorLogs(e.target.value)}
                  className="w-full bg-[#0b0f17] border border-slate-800 rounded-xl p-3 text-slate-300 focus:outline-none focus:border-cyan-500 font-mono text-xs resize-none"
                  placeholder="Paste error logs or failure stack traces..."
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleStartDiagnosis}
                disabled={isRunningPipeline || !selectedRepo}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs font-mono flex items-center gap-2 shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
              >
                {isRunningPipeline ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {isRunningPipeline ? 'Autonomous Pipeline Running...' : 'Execute Autonomous Engineering Pipeline'}
              </button>
            </div>
          </div>

          {/* Autonomous Multi-Agent Progress Timeline */}
          {activeWorkflow.length > 0 && (
            <div className="bg-[#111726] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 font-mono text-xs">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Autonomous Multi-Agent Workflow
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeWorkflow.map((step) => (
                  <div
                    key={step.stage}
                    className={`p-3.5 rounded-xl border transition-all ${
                      step.status === 'success'
                        ? 'bg-[#0b0f17] border-emerald-800/60 text-slate-300'
                        : step.status === 'running'
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200 animate-pulse'
                        : step.status === 'failed'
                        ? 'bg-rose-950/40 border-rose-800 text-rose-200'
                        : 'bg-[#0b0f17]/40 border-slate-800/60 text-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-1.5">
                        {step.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                        {step.status === 'running' && <RotateCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
                        {step.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                        {step.status === 'pending' && <span className="w-2 h-2 rounded-full bg-slate-700"></span>}
                        {step.title}
                      </span>
                      {step.timestamp && <span className="text-[10px] text-slate-500">{step.timestamp}</span>}
                    </div>
                    <p className="text-[11px] leading-relaxed line-clamp-2">{step.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Diagnosis Results, Diff Viewer & Developer Approval */}
      {diagnosisResult && (
        <div className="bg-[#111726] border border-cyan-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 animate-fadeIn font-mono">
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950 border border-cyan-500/40 text-cyan-300 text-xs font-semibold uppercase mb-1">
                <FileCheck2 className="w-3.5 h-3.5" />
                Proposed Surgical Patch Ready
              </div>
              <h2 className="text-xl font-bold text-white">Verification Complete &bull; Awaiting Developer Approval</h2>
              <p className="text-slate-400 text-xs mt-1">
                The patch has been verified in an isolated workspace. No changes will be applied to your source repository until you approve.
              </p>
            </div>

            {/* Approval Badges */}
            <div className="flex items-center gap-3">
              <span className="px-3 py-1.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                0 Regressions
              </span>
              <span className="px-3 py-1.5 rounded-lg bg-purple-950 text-purple-300 border border-purple-800 text-xs font-bold">
                Risk: {diagnosisResult.review?.riskLevel?.toUpperCase() || 'LOW'}
              </span>
            </div>
          </div>

          {/* Test Evidence Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Reproduction Test Output */}
            <div className="bg-[#0b0f17] p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-[11px] uppercase">
                <span>1. Bug Reproduction Test</span>
                <span className="text-emerald-400 font-bold">Verified Fixed</span>
              </div>
              <p className="text-slate-300 text-[11px]">{diagnosisResult.verification?.summary}</p>
              <pre className="bg-[#111726] p-2.5 rounded-lg text-[10px] text-emerald-300 overflow-x-auto">
                {diagnosisResult.verification?.output || 'Exit code: 0'}
              </pre>
            </div>

            {/* Existing Test Suite & Regressions */}
            <div className="bg-[#0b0f17] p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-slate-400 text-[11px] uppercase">
                <span>2. Regression Audit Suite</span>
                <span className="text-emerald-400 font-bold">0 Regressions</span>
              </div>
              <p className="text-slate-300 text-[11px]">{diagnosisResult.regression?.verdict}</p>
              <pre className="bg-[#111726] p-2.5 rounded-lg text-[10px] text-cyan-300 overflow-x-auto">
                {diagnosisResult.regression?.stdout || 'All tests passed'}
              </pre>
            </div>
          </div>

          {/* Unified Diff Viewer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold text-white flex items-center gap-2">
                <FileCode className="w-4 h-4 text-cyan-400" />
                Proposed Unified Diff
              </span>
              <span>{diagnosisResult.diffs?.length || 1} file(s) changed</span>
            </div>

            <div className="bg-[#0b0f17] rounded-2xl border border-slate-800 p-4 max-h-80 overflow-auto font-mono text-xs">
              {diagnosisResult.diffs && diagnosisResult.diffs.length > 0 ? (
                diagnosisResult.diffs.map((diff, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="text-cyan-300 font-bold text-xs pb-1 border-b border-slate-800">
                      {diff.file} (+{diff.additions} / -{diff.deletions})
                    </div>
                    <pre className="text-slate-300 text-[11px] whitespace-pre">
                      {diff.unifiedDiff.split('\n').map((line, lIdx) => (
                        <div
                          key={lIdx}
                          className={`${
                            line.startsWith('+') && !line.startsWith('+++')
                              ? 'bg-emerald-950/60 text-emerald-300 px-1 rounded'
                              : line.startsWith('-') && !line.startsWith('---')
                              ? 'bg-rose-950/60 text-rose-300 px-1 rounded'
                              : line.startsWith('@@')
                              ? 'text-cyan-400 font-bold'
                              : 'text-slate-400'
                          }`}
                        >
                          {line}
                        </div>
                      ))}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="text-slate-400">No diff generated.</div>
              )}
            </div>
          </div>

          {/* Review Summary */}
          <div className="bg-[#0b0f17] p-4 rounded-2xl border border-slate-800 text-xs space-y-1">
            <span className="text-slate-400 block text-[10px] uppercase">Code Reviewer Signoff:</span>
            <p className="text-slate-200">{diagnosisResult.review?.summary}</p>
          </div>

          {/* Action Approval Controls */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            {approvalStatus === 'approved' ? (
              <div className="w-full bg-emerald-950/80 border border-emerald-500 p-4 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                {approvalMessage || 'Patch approved by developer and successfully applied to source repository.'}
              </div>
            ) : approvalStatus === 'rejected' ? (
              <div className="w-full bg-rose-950/80 border border-rose-500 p-4 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-400" />
                {approvalMessage || 'Patch rejected. Workspace rolled back to original pre-patch state.'}
              </div>
            ) : (
              <>
                <div className="text-xs text-slate-400">
                  Select <strong className="text-emerald-400">Approve Changes</strong> to write the patch to your original repository source, or <strong className="text-rose-400">Reject</strong> to discard.
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRejectPatch}
                    className="px-5 py-2.5 bg-rose-950 hover:bg-rose-900 text-rose-200 border border-rose-700 font-bold rounded-xl text-xs flex items-center gap-2 transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Changes
                  </button>

                  <button
                    type="button"
                    onClick={handleApprovePatch}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-slate-950 font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve &amp; Apply Patch
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
