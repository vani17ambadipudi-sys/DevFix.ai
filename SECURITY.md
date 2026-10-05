# DevFix AI Platform — Security Policy & Architecture

This document details the security posture, threat model, mitigation strategies, and known limitations of the **DevFix AI** engineering platform.

---

## 1. Threat Model & Risks

### A. Untrusted Code Execution
* **Risk**: Users submit untrusted Python, JavaScript, or TypeScript code that may attempt process escalation, infinite recursion, filesystem wiping, or denial-of-service.
* **Mitigation**:
  * **Strict Language Allowlist**: Only pre-approved languages (`python`, `javascript`, `typescript`) are permitted. Shell interpreters, binaries, and compilers outside the allowlist are rejected.
  * **Sanitized Environment**: Subprocesses run with a stripped environment (`PATH`, `TMPDIR`, `HOME`). Host secrets (such as `GEMINI_API_KEY`, `JWT_SECRET`, database paths) are **never** passed to child execution processes.
  * **Isolated Scratch Directory**: Every execution runs in a freshly generated `/tmp/devfix_sandbox_<UUID>` directory with `0700` POSIX permissions, completely deleted in a `finally` block upon completion.
  * **Process Hard Timeouts**: An unyielding watchdog timer terminates stalled processes with `SIGKILL` after `EXECUTION_TIMEOUT_MS` (default 6,000ms).
  * **Output Truncation**: Stdout and stderr streams are capped at 10,000 characters to prevent buffer overflow or memory exhaustion.

### B. Model Context Protocol (MCP) Risks
* **Risk**: MCP tools (`read_project_file`, `inspect_project`, `run_code`) could be leveraged by prompt injection to read private keys or host files.
* **Mitigation**:
  * **Path Traversal Guard**: Rejects any path containing `..`, absolute root paths (`/`), `.env`, `id_rsa`, or system directories (`passwd`, `shadow`).
  * **Structured Schema Validation**: MCP arguments are checked against strict JSON schemas before tool dispatch.
  * **Comprehensive Tool Audit**: Every tool invocation is logged with duration, requester agent, and execution status.

### C. Authentication & Credential Storage
* **Risk**: Credential theft, unauthorized session hijacking.
* **Mitigation**:
  * **Scrypt Password Hashing**: Passwords are never stored in plaintext. They are salted with 16 bytes of cryptographically secure random bytes and hashed using Node.js `crypto.scryptSync`.
  * **Timing-Safe Equality**: Hash comparisons utilize `crypto.timingSafeEqual` to thwart timing attacks.
  * **JWT Validation**: Authenticated routes enforce signed HMAC-SHA256 JWT tokens. Password hashes are stripped before serialization.

### D. Rate Limiting & Denial of Service
* **Risk**: API exhaustion, runaway Gemini token billing, execution flood.
* **Mitigation**:
  * Sliding-window token buckets per IP / User:
    * Auth: 15 req/min
    * AI Debugging: 20 req/min
    * Code Execution: 30 req/min
    * General API: 120 req/min
  * Returns HTTP `429 Too Many Requests` with `Retry-After` headers.

---

## 2. Secrets Management

* **Zero Hardcoded Secrets**: Secrets must be loaded exclusively through environment variables.
* **Log Sanitization**: The structured logger filters out keys like `password`, `token`, `secret`, `apikey`, `authorization`.
* **Safe Error Responses**: The central error handler scrubs all stack traces, filesystem roots, and internal details from HTTP responses.

---

## 3. Known Limitations

* **Container Isolation**: While the Python/Node subprocesses run with sanitized environments and timeouts, true kernel-level isolation (e.g., gVisor, Firecracker, or Docker-in-Docker) requires privileged hosting not always present on basic developer laptops. Production enterprise deployments should run the sandbox inside a rootless container or sandbox microVM.
* **AI Output Fallibility**: AI-generated code should **never** be deployed directly to production systems without human review. DevFix AI incorporates a Tester Agent and Reviewer Agent to verify syntax and tests, but cannot guarantee absence of subtle logical vulnerabilities.
