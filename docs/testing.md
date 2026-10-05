# DevFix AI Platform — Testing & Verification Strategy

## 1. Test Architecture

The DevFix test suite is executed using Node.js 22 built-in assertion runner via `npm test`:

```bash
npm test
```

### Test Suites:

1. **Unit: Request & Path Validator (`tests/unit/validator.test.ts`)**:
   * Language allowlist enforcement.
   * Path traversal attack vector detection (`../../`, `.env`, `id_rsa`, `/etc/passwd`).
   * Safe relative path permissions.

2. **Unit: Secure Code Execution Sandbox (`tests/unit/sandbox.test.ts`)**:
   * Clean script execution (Python/Node).
   * Runtime exception and traceback capturing.
   * Unsupported language rejection without spawning processes.

3. **Unit: Hybrid Intelligence Model Router (`tests/unit/modelRouter.test.ts`)**:
   * User engine preference overrides.
   * Fallback resolution when API keys are unconfigured.

4. **Unit: MCP Server & Tool Registry (`tests/unit/mcpServer.test.ts`)**:
   * Inventory verification of all 4 tools (`run_code`, `read_project_file`, `inspect_project`, `search_documentation`).
   * Documentation search query execution.
   * MCP-level path traversal defense.

5. **Integration: Canonical Single-Snippet E2E Pipeline (`tests/integration/e2ePipeline.test.ts`)**:
   * Verifies the Section 38 off-by-one test case:
     $$\text{Code} \to \text{Analyzer} \to \text{Fixer} \to \text{Tester (MCP Sandbox)} \to \text{Reviewer Approval}$$
   * Confirms `range(len(numbers))` produces `[10, 20, 30]` with exit code 0.

6. **Integration: Failure Modes & Watchdog Timeouts (`tests/integration/failureModes.test.ts`)**:
   * Simulates infinite loop `while True: sleep(0.1)` and asserts watchdog timer triggers `SIGKILL` after timeout.
   * Rejects malformed requests and forbidden paths cleanly.

7. **Unit: Repository Scanner & Path Safety (`tests/unit/repositoryScanner.test.ts`)**:
   * Scans project manifests (package.json, tsconfig).
   * Verifies framework, language, and entry point detection.
   * Verifies strict path safety blocking traversal attacks and credentials.

8. **Unit: Patch System, Diffs & Checkpoints (`tests/unit/patchSystem.test.ts`)**:
   * Verifies atomic checkpoint creation and rollback.
   * Verifies unified diff generation and surgical patch application.
   * Confirms workspace isolation and security boundaries.

9. **Integration: Autonomous Repository Workflow (`tests/integration/repositoryWorkflow.test.ts`)**:
   * Verifies full Section 38 repository lifecycle:
     $$\text{Repository} \to \text{Understand} \to \text{Reproduce (HTTP 500)} \to \text{Root Cause} \to \text{Plan} \to \text{Patch} \to \text{Verify} \to \text{Regression Check (0 detected)} \to \text{Review} \to \text{Developer Approval}$$
   * Confirms reproduction test fails initially, passes post-patch, zero regressions in existing tests, and developer approval applies the fix to source.
