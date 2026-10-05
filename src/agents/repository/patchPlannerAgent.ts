import { RootCauseResult } from './rootCauseAnalyzerAgent';
import { ProjectContextSummary } from '../../../server/context/projectContext';

export interface PatchOperationPlan {
  file: string;
  operation: 'modify' | 'create' | 'delete';
  description: string;
}

export interface PatchPlan {
  targetFiles: string[];
  summary: string;
  operations: PatchOperationPlan[];
  verificationCriteria: string[];
}

export function runPatchPlannerAgent(
  context: ProjectContextSummary,
  rootCause: RootCauseResult
): PatchPlan {
  const targetFiles = rootCause.affectedFiles.length > 0
    ? rootCause.affectedFiles
    : [context.relevantFiles[0]?.path || 'src/routes/auth.js'];

  const operations: PatchOperationPlan[] = targetFiles.map((file) => ({
    file,
    operation: 'modify',
    description: `Add defensive input validation for required fields to prevent unhandled database exceptions.`,
  }));

  return {
    targetFiles,
    summary: `Plan to modify ${targetFiles.join(', ')}: implement early request validation and return HTTP 400 Bad Request for empty or missing inputs.`,
    operations,
    verificationCriteria: [
      'Reproduction script returns HTTP 400 Bad Request with exit code 0',
      'Valid credential logins continue to succeed (HTTP 200)',
      'Unknown credentials continue to return HTTP 401',
      'Zero test regressions introduced',
    ],
  };
}
