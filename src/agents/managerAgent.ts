import { GoogleGenAI } from '@google/genai';
import {
  AgentStep,
  AnalysisResult,
  DebuggingResult,
  FixResult,
  ReviewResult,
  TestResult,
} from '../types';
import { runAnalyzerAgent } from './analyzerAgent';
import { runFixerAgent } from './fixerAgent';
import { runTesterAgent } from './testerAgent';
import { runReviewerAgent } from './reviewerAgent';

import { mcpClient } from '../services/mcpClient';
import { MCPActivityEvent } from '../../mcp-server/types';

export interface ManagerProgressEvent {
  step: AgentStep;
  timeline: AgentStep[];
  mcpActivity?: MCPActivityEvent[];
}

export const MANAGER_SYSTEM_INSTRUCTION = `You are the Manager Agent.

You coordinate specialized software debugging agents.

Your workflow is:
1. Receive the user's debugging request.
2. Send the code to the Analyzer Agent.
3. Send the analysis to the Fixer Agent.
4. Send the corrected code to the Tester Agent.
5. Send the test result to the Reviewer Agent.
6. Inspect the review.
7. If the solution is rejected, coordinate another fix-test-review cycle.
8. Stop after a maximum of 3 cycles.
9. Return the final structured result.

Do not perform every specialized task yourself.
Delegate work to the appropriate specialist.`;

export async function runManagerAgent(
  ai: GoogleGenAI,
  language: string,
  code: string,
  description: string | undefined,
  testExecution: boolean = true,
  onProgress?: (event: ManagerProgressEvent) => void
): Promise<DebuggingResult> {
  const initialTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Initial timeline with 5 cooperating agents
  const timeline: AgentStep[] = [
    { id: '1', agent: 'Manager', status: 'Working', timestamp: initialTimestamp, summary: 'Orchestrating workflow' },
    { id: '2', agent: 'Analyzer', status: 'Waiting', timestamp: initialTimestamp, summary: 'Awaiting dispatch' },
    { id: '3', agent: 'Fixer', status: 'Waiting', timestamp: initialTimestamp, summary: 'Awaiting analysis' },
    { id: '4', agent: 'Tester', status: 'Waiting', timestamp: initialTimestamp, summary: 'Awaiting fix' },
    { id: '5', agent: 'Reviewer', status: 'Waiting', timestamp: initialTimestamp, summary: 'Awaiting test results' },
  ];

  const updateAgent = (
    agentName: 'Manager' | 'Analyzer' | 'Fixer' | 'Tester' | 'Reviewer',
    status: 'Waiting' | 'Working' | 'Completed' | 'Failed',
    summary?: string,
    details?: string,
    cycle?: number
  ) => {
    const item = timeline.find((t) => t.agent === agentName);
    if (item) {
      item.status = status;
      item.timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      if (summary) item.summary = summary;
      if (details) item.details = details;
      if (cycle) item.cycle = cycle;
      onProgress?.({
        step: { ...item },
        timeline: [...timeline],
        mcpActivity: mcpClient.getActivityLog(),
      });
    }
  };

  // Step 1: Manager coordinates Analyzer
  updateAgent('Manager', 'Working', 'Dispatched code to Analyzer Agent');
  updateAgent('Analyzer', 'Working', 'Scanning syntax, types, logic, and edge cases');

  let analysis: AnalysisResult;
  try {
    analysis = await runAnalyzerAgent(ai, language, code, description);
    const problemCount = analysis.problems.length;
    updateAgent(
      'Analyzer',
      'Completed',
      `Identified ${problemCount} problem${problemCount === 1 ? '' : 's'} (${analysis.errorTypes.join(', ') || 'No Obvious Error'})`,
      analysis.summary
    );
  } catch (err: any) {
    updateAgent('Analyzer', 'Failed', 'Analysis failed', err?.message);
    throw err;
  }

  // Iterative Cycle: Fixer -> Tester -> Reviewer (max 3 cycles)
  const maxCycles = 3;
  let cycle = 1;
  let fix: FixResult = { correctedCode: code, changes: [], explanation: '' };
  let test: TestResult = { attempted: false, success: false, stdout: '', stderr: '', attempt: 1 };
  let review: ReviewResult = { approved: false, summary: '', remainingIssues: [], recommendations: [] };

  while (cycle <= maxCycles) {
    // Step 2: Fixer Agent
    updateAgent(
      'Fixer',
      'Working',
      cycle === 1 ? 'Generating minimal repair' : `Refining fix (Cycle ${cycle})`,
      undefined,
      cycle
    );

    try {
      fix = await runFixerAgent(
        ai,
        language,
        code,
        analysis,
        cycle > 1 ? test : undefined,
        cycle > 1 ? review : undefined
      );

      updateAgent(
        'Fixer',
        'Completed',
        `Generated fix (${fix.changes.length} change${fix.changes.length === 1 ? '' : 's'})`,
        fix.explanation,
        cycle
      );
    } catch (err: any) {
      updateAgent('Fixer', 'Failed', 'Fixer generation failed', err?.message, cycle);
      throw err;
    }

    // Step 3: Tester Agent (uses Stage 2 codeExecutionTool)
    if (testExecution) {
      updateAgent(
        'Tester',
        'Working',
        `Testing fix in sandbox (Cycle ${cycle})`,
        undefined,
        cycle
      );

      try {
        test = await runTesterAgent(fix.correctedCode, language, cycle);
        const statusLabel = test.attempted
          ? test.success
            ? 'Execution SUCCESS (exit 0)'
            : `Execution FAILED (exit ${test.exitCode ?? 1})`
          : 'Static analysis only (execution unavailable)';

        updateAgent(
          'Tester',
          test.attempted ? (test.success ? 'Completed' : 'Failed') : 'Completed',
          statusLabel,
          test.stdout || test.stderr || test.reason,
          cycle
        );
      } catch (err: any) {
        updateAgent('Tester', 'Failed', 'Test execution error', err?.message, cycle);
        test = {
          attempted: true,
          success: false,
          stdout: '',
          stderr: String(err),
          exitCode: 1,
          attempt: cycle,
        };
      }
    } else {
      test = {
        attempted: false,
        success: false,
        stdout: '',
        stderr: '',
        attempt: cycle,
        reason: 'Static mode requested by user',
      };
      updateAgent('Tester', 'Completed', 'Skipped (Static analysis mode)', undefined, cycle);
    }

    // Step 4: Reviewer Agent
    updateAgent(
      'Reviewer',
      'Working',
      `Evaluating solution & verification (Cycle ${cycle})`,
      undefined,
      cycle
    );

    try {
      review = await runReviewerAgent(ai, language, code, analysis, fix, test);

      updateAgent(
        'Reviewer',
        review.approved ? 'Completed' : (cycle < maxCycles ? 'Working' : 'Failed'),
        review.approved
          ? 'Solution APPROVED ✓'
          : `Solution REJECTED ✗ (Cycle ${cycle})`,
        review.summary,
        cycle
      );
    } catch (err: any) {
      updateAgent('Reviewer', 'Failed', 'Review evaluation failed', err?.message, cycle);
      review = {
        approved: test.success,
        summary: 'Automatic fallback review.',
        remainingIssues: [],
        recommendations: [],
      };
    }

    // If Reviewer approved or we reached maximum cycles, break
    if (review.approved || cycle >= maxCycles) {
      break;
    }

    // Otherwise, coordinate next cycle through Manager
    updateAgent('Manager', 'Working', `Reviewer rejected fix. Initiating revision cycle ${cycle + 1}...`);
    cycle++;
  }

  // Final Step: Manager completes and compiles final structured response
  updateAgent(
    'Manager',
    'Completed',
    `Multi-agent workflow complete (${cycle} cycle${cycle === 1 ? '' : 's'})`,
    review.approved ? 'Solution verified and approved.' : 'Final candidate produced after maximum cycles.'
  );

  // Construct beginner-friendly learning tip based on findings
  const learningTip =
    analysis.recommendations[0] ||
    review.recommendations[0] ||
    'Review language fundamentals and write unit tests for boundary conditions.';

  return {
    language,
    status: analysis.status as any,
    summary: `${analysis.summary} ${review.summary}`,
    errorTypes: analysis.errorTypes,
    problems: analysis.problems,
    correctedCode: fix.correctedCode,
    changes: fix.changes,
    execution: {
      attempted: test.attempted,
      success: test.success,
      stdout: test.stdout,
      stderr: test.stderr,
      exitCode: test.exitCode,
      executionTime: test.executionTime,
      attempts: cycle,
      reason: test.reason,
    },
    example: {
      input: `Original ${language} snippet`,
      expectedOutput: test.stdout || 'Clean execution without errors',
    },
    learningTip,
    // Stage 3 & 4 multi-agent & MCP metadata
    analysis,
    fix,
    test,
    review,
    attempts: cycle,
    agentTimeline: timeline,
    mcpActivity: mcpClient.getActivityLog(),
    mcpToolsUsed: ['run_code', 'search_documentation', 'inspect_project'],
    mcpStatus: 'Connected',
  };
}
