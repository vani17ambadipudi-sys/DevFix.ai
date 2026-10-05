export type SupportedLanguage =
  | 'Python'
  | 'Java'
  | 'JavaScript'
  | 'TypeScript'
  | 'C'
  | 'C++'
  | 'SQL'
  | 'HTML'
  | 'CSS';

export type ErrorCategory =
  | 'Syntax Error'
  | 'Runtime Error'
  | 'Logical Error'
  | 'Type Error'
  | 'Null/Undefined Error'
  | 'API/Integration Error'
  | 'Database Error'
  | 'Configuration Error'
  | 'Security Issue'
  | 'Performance Issue'
  | 'Edge Case'
  | 'No Obvious Error';

export type DebugStatus = 'error_found' | 'warning' | 'no_error';

export interface DebugProblem {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  line?: number | null;
}

export type Problem = DebugProblem;

export interface DebugExample {
  input: string;
  expectedOutput: string;
}

export interface ExecutionAttemptLog {
  attempt: number;
  code: string;
  stdout: string;
  stderr: string;
  exitCode?: number;
  success: boolean;
  executionTime?: number;
}

export interface ExecutionResult {
  attempted: boolean;
  success: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  executionTime?: number;
  attempts?: number;
  reason?: string;
  history?: ExecutionAttemptLog[];
}

export interface MCPActivityEvent {
  id: string;
  timestamp: string;
  requesterAgent: string;
  tool: string;
  action: 'requested' | 'received' | 'completed' | 'failed';
  message: string;
  details?: string;
  durationMs?: number;
}

export interface MCPToolInfo {
  name: string;
  description: string;
  status: 'Connected' | 'Ready';
}

export interface DebuggingResult {
  language: SupportedLanguage | string;
  status: DebugStatus;
  summary: string;
  errorTypes: (ErrorCategory | string)[];
  problems: DebugProblem[];
  correctedCode: string;
  changes: string[];
  execution?: ExecutionResult;
  example: DebugExample;
  learningTip: string;
  // Multi-Agent Stage 3 & 4 extensions
  analysis?: AnalysisResult;
  fix?: FixResult;
  test?: TestResult;
  review?: ReviewResult;
  attempts?: number;
  agentTimeline?: AgentStep[];
  mcpActivity?: MCPActivityEvent[];
  mcpToolsUsed?: string[];
  mcpStatus?: 'Connected' | 'Disconnected';
}

// Stage 3 & 4 Multi-Agent Structured Communication
export interface AnalysisResult {
  status: string;
  summary: string;
  errorTypes: string[];
  problems: Problem[];
  recommendations: string[];
}

export interface FixResult {
  correctedCode: string;
  changes: string[];
  explanation: string;
}

export interface TestResult {
  attempted: boolean;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode?: number;
  executionTime?: number;
  attempt: number;
  attempts?: number;
  reason?: string;
}

export interface ReviewResult {
  approved: boolean;
  summary: string;
  remainingIssues: string[];
  recommendations: string[];
}

export type AgentName = 'Manager' | 'Analyzer' | 'Fixer' | 'Tester' | 'Reviewer';
export type AgentStatus = 'Waiting' | 'Working' | 'Completed' | 'Failed';

export interface AgentStep {
  id: string;
  agent: AgentName;
  status: AgentStatus;
  timestamp: string;
  summary?: string;
  details?: string;
  cycle?: number;
}

export interface MultiAgentDebugSession {
  id: string;
  timestamp: string;
  language: SupportedLanguage;
  originalCode: string;
  description?: string;
  analysis: AnalysisResult;
  fix: FixResult;
  test: TestResult;
  review: ReviewResult;
  attempts: number;
  agentTimeline: AgentStep[];
  debuggingResult: DebuggingResult;
  mcpActivity?: MCPActivityEvent[];
  mcpToolsUsed?: string[];
}

export type DebugSession =
  | MultiAgentDebugSession
  | {
      id: string;
      timestamp: string;
      language: SupportedLanguage;
      code: string;
      description?: string;
      debuggingResult: DebuggingResult;
    };

export interface FollowUpMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface CodeExampleSnippet {
  id: string;
  title: string;
  category: 'Syntax Error' | 'Runtime Error' | 'Logical Error' | 'Correct Code' | 'Edge Case';
  language: SupportedLanguage;
  description: string;
  code: string;
  userPrompt?: string;
}
