import { GoogleGenAI } from '@google/genai';
import { db, RepositoryRecord, IssueRecord, PatchRecord } from '../../../server/database/db';
import { ProjectContextEngine, ProjectContextSummary } from '../../../server/context/projectContext';
import { WorkspaceManager } from '../../../server/workspace/workspaceManager';
import { mcpServer } from '../../../mcp-server/server';
import { tracer } from '../../../server/observability/tracer';
import { logger } from '../../../server/observability/logger';

// Agents
import { runRepositoryAnalystAgent, RepositoryAnalysisResult } from './repositoryAnalystAgent';
import { runBugReproducerAgent, ReproductionResult } from './bugReproducerAgent';
import { runRootCauseAnalyzerAgent, RootCauseResult } from './rootCauseAnalyzerAgent';
import { runPatchPlannerAgent, PatchPlan } from './patchPlannerAgent';
import { runPatchGeneratorAgent } from './patchGeneratorAgent';
import { runTestEngineerAgent, TestVerificationResult } from './testEngineerAgent';
import { runRegressionCheckerAgent, RegressionCheckResult } from './regressionCheckerAgent';
import { runCodeReviewerAgent, CodeReviewResult } from './codeReviewerAgent';
import { FileDiff } from '../../../mcp-server/types';

export interface RepositoryWorkflowEvent {
  stage:
    | 'understand'
    | 'reproduce'
    | 'analyze'
    | 'plan'
    | 'patch'
    | 'test'
    | 'regression'
    | 'review'
    | 'completed'
    | 'error';
  status: 'running' | 'success' | 'failed';
  title: string;
  summary: string;
  data?: any;
  timestamp: string;
}

export interface RepositoryWorkflowResult {
  repositoryId: string;
  issueId: string;
  patchId: string;
  context: ProjectContextSummary;
  analysis: RepositoryAnalysisResult;
  reproduction: ReproductionResult;
  rootCause: RootCauseResult;
  plan: PatchPlan;
  verification: TestVerificationResult;
  regression: RegressionCheckResult;
  review: CodeReviewResult;
  diffs: FileDiff[];
  combinedDiff: string;
  status: 'proposed' | 'verified' | 'failed';
  requiresDeveloperApproval: boolean;
}

export class RepositoryOrchestrator {
  private static readonly MAX_REPAIR_ATTEMPTS = 3;

  public static async executeDiagnosis(
    repo: RepositoryRecord,
    issueDescription: string,
    errorLogs?: string,
    ai: GoogleGenAI | null = null,
    onProgress?: (event: RepositoryWorkflowEvent) => void,
    requestId: string = `repo_diag_${Date.now()}`
  ): Promise<RepositoryWorkflowResult> {
    const startTime = Date.now();
    tracer.startTrace(requestId, 'repository_autonomous_diagnosis');

    const emit = (
      stage: RepositoryWorkflowEvent['stage'],
      status: RepositoryWorkflowEvent['status'],
      title: string,
      summary: string,
      data?: any
    ) => {
      const event: RepositoryWorkflowEvent = {
        stage,
        status,
        title,
        summary,
        data,
        timestamp: new Date().toLocaleTimeString(),
      };
      if (onProgress) onProgress(event);
      logger.info(`repo_workflow_${stage}`, requestId, { status, title });
    };

    // 1. UNDERSTAND: Build context & analyze repository
    emit('understand', 'running', 'Repository Analyst', 'Indexing repository architecture and identifying modules...');
    tracer.stepStart(requestId, 'Repository Analyst', 'Repository Analyst Agent');
    const context = await ProjectContextEngine.buildContext(repo, issueDescription, errorLogs);
    const analysis = await runRepositoryAnalystAgent(ai, context, issueDescription, errorLogs);
    tracer.stepEnd(requestId, 'Repository Analyst', 'success');
    emit('understand', 'success', 'Repository Analyzed', analysis.summary, analysis);

    // Save issue in database
    const issue = db.saveIssue({
      repositoryId: repo.id,
      title: issueDescription.slice(0, 80),
      description: issueDescription,
      errorLogs,
      status: 'in_progress',
    });

    // 2. REPRODUCE: Run minimal reproduction script in isolated workspace
    emit('reproduce', 'running', 'Bug Reproducer', 'Executing reproduction script to confirm reported failure...');
    tracer.stepStart(requestId, 'Bug Reproducer', 'Bug Reproducer Agent');
    const reproduction = await runBugReproducerAgent(repo, issueDescription, requestId);
    tracer.stepEnd(requestId, 'Bug Reproducer', 'success');
    emit('reproduce', 'success', 'Bug Reproduced', reproduction.summary, reproduction);

    db.updateIssue(issue.id, {
      reproductionCommand: reproduction.command,
      reproductionResult: reproduction,
      status: 'reproduced',
    });

    // 3. ANALYZE: Root Cause Investigation
    emit('analyze', 'running', 'Root Cause Analyzer', 'Evaluating failure evidence and identifying vulnerability...');
    tracer.stepStart(requestId, 'Root Cause Analyzer', 'Root Cause Analyzer Agent');
    const rootCause = await runRootCauseAnalyzerAgent(ai, context, reproduction, issueDescription);
    tracer.stepEnd(requestId, 'Root Cause Analyzer', 'success');
    emit('analyze', 'success', 'Root Cause Identified', rootCause.rootCause, rootCause);

    db.updateIssue(issue.id, {
      rootCause: {
        summary: rootCause.rootCause,
        affectedFiles: rootCause.affectedFiles,
        evidence: rootCause.evidence,
      },
    });

    // 4. PLAN: Formulate structured patch plan
    emit('plan', 'running', 'Patch Planner', 'Formulating surgical patch operations and boundary criteria...');
    tracer.stepStart(requestId, 'Patch Planner', 'Patch Planner Agent');
    const plan = runPatchPlannerAgent(context, rootCause);
    tracer.stepEnd(requestId, 'Patch Planner', 'success');
    emit('plan', 'success', 'Patch Plan Formulated', plan.summary, plan);

    // 5. CHECKPOINT: Create pre-patch checkpoint before touching workspace
    const checkpoint = WorkspaceManager.createCheckpoint(repo.id, 'Pre-patch Auto Checkpoint');

    // 6. PATCH: Generate changes and apply via MCP
    emit('patch', 'running', 'Patch Generator', 'Generating code modifications and applying to isolated workspace...');
    tracer.stepStart(requestId, 'Patch Generator', 'Patch Generator Agent');
    const patchFiles = await runPatchGeneratorAgent(ai, context, plan, repo.workspacePath);

    // Apply each file via MCP apply_patch
    const changedFiles: string[] = [];
    for (const pf of patchFiles) {
      const applyRes = await mcpServer.executeTool({
        tool: 'apply_patch',
        arguments: {
          workspacePath: repo.workspacePath,
          file: pf.file,
          patch: pf.newContent,
          operation: pf.operation,
        },
        requesterAgent: 'Patch Generator Agent',
      });
      if (applyRes.success) {
        changedFiles.push(pf.file);
      }
    }
    tracer.stepEnd(requestId, 'Patch Generator', 'success');
    emit('patch', 'success', 'Patch Applied to Workspace', `Modified ${changedFiles.length} file(s) in isolated workspace.`, { changedFiles });

    // 7. TEST: Test Engineer verifies reproduction command now passes
    emit('test', 'running', 'Test Engineer', 'Executing reproduction script to verify bug resolution...');
    tracer.stepStart(requestId, 'Test Engineer', 'Test Engineer Agent');
    const verification = await runTestEngineerAgent(repo, reproduction.command);
    tracer.stepEnd(requestId, 'Test Engineer', verification.success ? 'success' : 'failed');
    emit('test', verification.success ? 'success' : 'failed', 'Reproduction Verification', verification.summary, verification);

    // 8. REGRESSION CHECK: Audit existing test suites
    emit('regression', 'running', 'Regression Checker', 'Running legacy test suites to check for introduced regressions...');
    tracer.stepStart(requestId, 'Regression Checker', 'Regression Checker Agent');
    const regression = await runRegressionCheckerAgent(repo, context.testCommand);
    tracer.stepEnd(requestId, 'Regression Checker', regression.success ? 'success' : 'failed');
    emit('regression', regression.success ? 'success' : 'failed', 'Regression Check Complete', regression.verdict, regression);

    // 9. GENERATE DIFF: Compute unified diff comparing original vs workspace
    const diffRes = await mcpServer.executeTool({
      tool: 'generate_diff',
      arguments: {
        workspacePath: repo.workspacePath,
        originalPath: repo.originalPath,
        files: changedFiles,
      },
      requesterAgent: 'Repository Orchestrator',
    });
    const diffData = diffRes.data || { diffs: [], combinedDiff: '' };

    // 10. REVIEW: Code Reviewer evaluates diff and test evidence
    emit('review', 'running', 'Code Reviewer', 'Auditing diff, security boundaries, and test evidence...');
    tracer.stepStart(requestId, 'Code Reviewer', 'Code Reviewer Agent');
    const review = await runCodeReviewerAgent(ai, diffData.diffs, verification, regression);
    tracer.stepEnd(requestId, 'Code Reviewer', review.approved ? 'success' : 'failed');
    emit('review', review.approved ? 'success' : 'failed', 'Code Review Signoff', review.summary, review);

    // Save Patch record in database with status 'proposed' (Awaiting Developer Approval!)
    const patchRecord = db.savePatch({
      issueId: issue.id,
      repositoryId: repo.id,
      plan: {
        targetFiles: plan.targetFiles,
        summary: plan.summary,
        operations: plan.operations,
      },
      diff: diffData.combinedDiff,
      changedFiles,
      status: 'proposed', // CRITICAL: Awaiting explicit developer approval!
      verification: {
        reproductionPassed: verification.success,
        existingTestsPassed: regression.success,
        regressionsDetected: regression.regressionsDetected,
        details: verification.summary,
      },
      review: {
        approved: review.approved,
        summary: review.summary,
        riskLevel: review.riskLevel,
        concerns: review.concerns,
      },
      attempts: 1,
    });

    const isVerified = verification.success && regression.success && review.approved;
    db.updateIssue(issue.id, {
      status: isVerified ? 'open' : 'failed',
    });

    tracer.finishTrace(requestId, isVerified ? 'success' : 'error');

    emit(
      'completed',
      'success',
      'Diagnosis Complete — Awaiting Approval',
      'Proposed patch has been generated, tested in isolation, and reviewed. Review the unified diff and click [Approve Changes] to apply to your repository.',
      { patchId: patchRecord.id }
    );

    return {
      repositoryId: repo.id,
      issueId: issue.id,
      patchId: patchRecord.id,
      context,
      analysis,
      reproduction,
      rootCause,
      plan,
      verification,
      regression,
      review,
      diffs: diffData.diffs,
      combinedDiff: diffData.combinedDiff,
      status: isVerified ? 'proposed' : 'failed',
      requiresDeveloperApproval: true,
    };
  }
}
