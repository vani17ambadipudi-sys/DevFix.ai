export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPToolRequest {
  tool: string;
  arguments: Record<string, unknown>;
  requesterAgent?: string;
}

export interface MCPToolResponse<T = any> {
  success: boolean;
  tool: string;
  data?: T;
  error?: string;
  executionTimeMs?: number;
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

// 1. run_code tool schemas
export interface RunCodeArgs {
  language: string;
  code: string;
}

export interface RunCodeResult {
  attempted: boolean;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode?: number;
  executionTime?: number;
  reason?: string;
}

// 2. read_project_file tool schemas
export interface ReadProjectFileArgs {
  path: string;
  workspacePath?: string;
}

export interface ReadProjectFileResult {
  path: string;
  content: string;
  sizeBytes: number;
  linesCount: number;
}

// 3. inspect_project tool schemas
export interface InspectProjectArgs {
  subDirectory?: string;
  workspacePath?: string;
}

export interface InspectProjectResult {
  projectName: string;
  files: string[];
  directories: string[];
  totalFiles: number;
}

// 4. search_documentation tool schemas
export interface SearchDocumentationArgs {
  query: string;
  technology?: string;
}

export interface DocSearchResult {
  title: string;
  description: string;
  source: string;
  snippet?: string;
}

export interface SearchDocumentationResult {
  query: string;
  technology?: string;
  results: DocSearchResult[];
}

// 5. search_project tool schemas (Phase 8)
export interface SearchProjectArgs {
  query: string;
  workspacePath?: string;
  filePattern?: string;
}

export interface ProjectSearchMatch {
  file: string;
  line: number;
  snippet: string;
}

export interface SearchProjectResult {
  query: string;
  totalMatches: number;
  matches: ProjectSearchMatch[];
}

// 6. run_tests tool schemas (Phase 8)
export interface RunTestsArgs {
  workspacePath: string;
  testCommand?: string;
  timeoutMs?: number;
}

export interface RunTestsResult {
  attempted: boolean;
  success: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
}

// 7. apply_patch tool schemas (Phase 8)
export interface ApplyPatchArgs {
  workspacePath: string;
  file: string;
  patch: string;
  operation?: 'modify' | 'create' | 'delete';
}

export interface ApplyPatchResult {
  success: boolean;
  file: string;
  operation: string;
  bytesWritten?: number;
  message: string;
}

// 8. generate_diff tool schemas (Phase 8)
export interface GenerateDiffArgs {
  workspacePath: string;
  originalPath: string;
  files?: string[];
}

export interface FileDiff {
  file: string;
  unifiedDiff: string;
  additions: number;
  deletions: number;
}

export interface GenerateDiffResult {
  totalChangedFiles: number;
  diffs: FileDiff[];
  combinedDiff: string;
}

// 9. git_status & git_diff schemas (Phase 8)
export interface GitStatusArgs {
  workspacePath: string;
}

export interface GitStatusResult {
  isGitRepo: boolean;
  branch?: string;
  modifiedFiles: string[];
  untrackedFiles: string[];
}
