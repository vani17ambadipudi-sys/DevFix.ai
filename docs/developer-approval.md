# DevFix AI — Developer Approval & Control Architecture

## 1. Developer In The Loop Invariant

A foundational tenet of DevFix AI:

$$\textbf{DevFix AI may propose and verify changes, but the developer remains in control of applying them.}$$

* The autonomous pipeline halts upon completing testing, regression checks, and code review.
* The system displays:
  * Unified diff of changed files
  * Reproduction test execution output
  * Legacy test suite pass verification (0 regressions)
  * Code reviewer evidence & risk evaluation
* Two explicit developer actions are presented:
  1. `[Approve & Apply Patch]`: Calls `POST /api/issues/:id/approve` and copies files from the workspace to the source repository.
  2. `[Reject & Discard]`: Calls `POST /api/issues/:id/reject`, logs developer feedback, and triggers a workspace rollback.
