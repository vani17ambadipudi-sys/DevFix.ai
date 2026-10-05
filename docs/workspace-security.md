# DevFix AI — Workspace Security & Isolation Specification

## 1. Security Invariants

Phase 8 handles multi-file repositories, which introduces significant security challenges. The system enforces:

### A. Zip-Slip Defense (`server/repository/repositoryImporter.ts`)
* Evaluates `targetFilePath.startsWith(resolvedSource + path.sep)`.
* Rejects any archive entry with `..`, absolute paths, or escaping traversals.

### B. Path Traversal & Sensitive File Filtering (`server/repository/repositoryScanner.ts`)
* Rejects any path containing `..`, leading slashes, or references to:
  * `.env`, `.env.*`
  * `id_rsa`, `*.pem`, `*.key`, `*.crt`
  * `/etc/passwd`, `/etc/shadow`
* Excludes `node_modules`, `.git`, `.venv`, and `dist` from scanning and diffing.

### C. Allowlisted Test Execution (`mcp-server/tools/runTests.ts`)
* Only allowlisted test prefixes can be executed:
  `npm test`, `npx vitest`, `pytest`, `python3 -m unittest`, `node tests/`, `cargo test`, `go test`.
* Arbitrary shell commands (`rm -rf`, `curl`, `wget`, `bash -c`) are rejected before spawning processes.
* Environment variables are stripped: zero host secrets or API keys are passed to test subprocesses.
* Hard timeouts (default 8,000ms) with `SIGKILL` termination.

### D. Workspace Retention Policy
* Workspaces older than `WORKSPACE_RETENTION_HOURS` (24h default) are garbage-collected by `db.cleanupExpiredWorkspaces()`.
