# DevFix AI — Autonomous Repository Engineering Workflow

## 1. Concept

DevFix AI transforms from single-snippet debugging into **Autonomous Repository Engineering**.
Instead of analyzing isolated functions, DevFix understands multi-file codebases, reproduces bugs using real project commands, formulates surgical patches, and verifies that zero regressions were introduced.

```text
REPOSITORY
    ↓
UNDERSTAND (Repository Analyst Agent)
    ↓
REPRODUCE (Bug Reproducer Agent via MCP run_tests)
    ↓
ANALYZE (Root Cause Analyzer Agent)
    ↓
PLAN (Patch Planner Agent)
    ↓
CHECKPOINT (WorkspaceManager snapshot)
    ↓
PATCH (Patch Generator Agent via MCP apply_patch)
    ↓
TEST (Test Engineer Agent verifying reproduction)
    ↓
REGRESSION CHECK (Regression Checker Agent auditing test suite)
    ↓
REVIEW (Code Reviewer Agent)
    ↓
UNIFIED DIFF (MCP generate_diff)
    ↓
DEVELOPER APPROVAL (Explicit [Approve] or [Reject])
```

---

## 2. Agent Responsibilities

| Agent | Responsibility | Output / Artifact |
|:---|:---|:---|
| **Repository Analyst** | Scans repository manifests, identifies affected modules and entry points without modifying code. | `RepositoryAnalysisResult` |
| **Bug Reproducer** | Identifies or crafts minimal reproduction commands; executes in isolated workspace; captures HTTP 500 or test failure. | `ReproductionResult` (confirmed failure) |
| **Root Cause Analyzer**| Analyzes reproduction trace, stack traces, and relevant file contents to identify the root cause with evidence. | `RootCauseResult` |
| **Patch Planner** | Formulates surgical file operations (`modify`, `create`, `delete`) and verification criteria before code is written. | `PatchPlan` |
| **Patch Generator** | Generates minimal code replacements strictly conforming to the plan. Dispatched via MCP `apply_patch`. | `GeneratedPatchFile[]` |
| **Test Engineer** | Executes the reproduction command against the patched workspace to verify the bug is eliminated. | `TestVerificationResult` (exit code 0) |
| **Regression Checker** | Runs existing project test suites (before vs after) to guarantee 0 regressions were introduced. | `RegressionCheckResult` (0 regressions) |
| **Code Reviewer** | Audits diff, security boundaries, and test proof. Assigns evidence-backed risk level (`low`/`medium`/`high`). | `CodeReviewResult` |

---

## 3. Safe Workspace Model

DevFix AI **never** modifies the user's original repository directly.
* All AI investigations, patches, and test executions occur in a strictly isolated working directory (`data/workspaces/<repoId>/workspace`).
* Checkpoints are automatically generated before any file writes.
* The developer must explicitly click **Approve & Apply Patch** before changes are copied to the original source.
