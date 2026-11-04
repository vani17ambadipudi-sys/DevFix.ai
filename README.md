# DevFix AI — Predictive Software Engineering Platform

DevFix AI is an autonomous, repository-level software engineering and preventive maintenance platform. It evolves from reactive single-snippet debugging into an enterprise **Predictive Software Engineering System** capable of analyzing repository telemetry, identifying emerging risk areas, explaining empirical evidence, and recommending preventive actions before defects cause production outages.

> **CURRENT STAGE: STAGE 10 (PREDICTIVE SOFTWARE ENGINEERING & PREVENTIVE MAINTENANCE)**  
> **Evolutionary Scope:** Phases 1 through 10 fully implemented, operational, and verified across 12 automated test suites (100% pass rate).  
> **Core Principle:** *Predictions are evidence-based risk indicators, not guarantees of failure.* Facts, measurements, interpretations, and recommendations are strictly distinguished. DevFix AI proposes and verifies changes, but the developer remains in complete control.

---

## 1. High-Level Architecture

```text
                                DEVELOPER
                                    ↓
                         REACT DASHBOARD (Predictive Ops)
                                    ↓
                         EXPRESS API GATEWAY
                                    ↓
                       PREDICTION MANAGER AGENT
                                    ↓
             ┌──────────────────────┼──────────────────────┐
             ↓                      ↓                      ↓
     Historical Analyzer     Current Signal Analyzer   Repository Analyzer
             ↓                      ↓                      ↓
             └──────────────────────┼──────────────────────┘
                                    ↓
                           RISK ANALYSIS ENGINE
                                    ↓
                         EVIDENCE CORRELATION ENGINE
                                    ↓
                       PREDICTIVE AGENT LAYER
             ┌──────────────────────┼──────────────────────┐
             ↓                      ↓                      ↓
     Quality Risk Agent    Security Risk Agent    Dependency Risk Agent
             ↓                      ↓                      ↓
             └──────────────────────┼──────────────────────┘
                                    ↓
                         PREVENTIVE PLANNER AGENT
                                    ↓
                         CODE REVIEWER AGENT
                                    ↓
                    PREVENTIVE RECOMMENDATIONS & DIFFS
                                    ↓
                       DEVELOPER APPROVAL GATEWAY
                     ┌──────────────┴──────────────┐
                     ↓                             ↓
            [Accept Recommendation]       [Dismiss / Investigate]
                     ↓                             ↓
          Apply Patch / Create Issue    Log Feedback & Retain State
```

---

## 2. Evidence-First 5-Layer Model

Every risk assessment and preventive recommendation provides complete evidentiary traceability:

```text
1. OBSERVATION
   8 recorded test failures in src/payments.

2. MEASURED EVIDENCE
   Database records confirm 8 failing test executions out of 20 runs over the past 30 days.

3. AI INTERPRETATION
   The payments module has accumulated several maintenance signals and exhibits elevated defect density.

4. UNCERTAINTY & LIMITATIONS
   Historical telemetry is bounded to the past 30 days; tests may not exercise 100% of internal branches.

5. ACTIONABLE RECOMMENDATION
   Expand automated regression tests targeting payment gateway timeout handling and currency precision.
```

---

## 3. Specialized Predictive Agent Layer

| Agent | Responsibility | Output / Artifact |
|:---|:---|:---|
| **Prediction Manager Agent** | Orchestrates signal aggregation, coordinates risk agents, and synthesizes final reports. | `PredictionReport` |
| **Trend Analyzer Agent** | Analyzes 4-week failure trajectories and performance drift over time. | `TrendAnalysisResult` |
| **Quality Risk Agent** | Analyzes test failure frequency, recent code churn, and cyclomatic complexity. | `QualityRiskAssessment` |
| **Security Risk Agent** | Audits static analysis warnings, signature timing risks, and permissive CORS advisories. | `SecurityRiskAssessment` |
| **Dependency Risk Agent** | Evaluates dependency age, published CVE advisories, and lockfile drifts. | `DependencyRiskAssessment` |
| **Preventive Planner Agent** | Formulates prioritized preventive maintenance tasks grounded in evidence. | `PreventiveRecommendation[]` |

---

## 4. MCP Tools Registry (18 Standardized Tools)

The Model Context Protocol Server exposes 18 standardized tools across Stage 4, Stage 8, and Stage 10:

1. `inspect_project`: Multi-file directory and manifest tree inspector.
2. `read_project_file`: Traversal-safe file reader preventing path escapes.
3. `search_project`: Symbol and keyword search across permitted workspace files.
4. `run_code`: Subprocess execution sandbox with watchdog timers.
5. `run_tests`: Executes allowlisted test suites (`npm test`, `pytest`, `cargo test`, `go test`).
6. `generate_diff`: Generates standard unified diff comparing original vs patched workspace.
7. `apply_patch`: Writes surgical modifications inside workspace boundaries.
8. `git_status`: Safe read-only inspection of git status.
9. `git_diff`: Safe read-only inspection of uncommitted git diffs.
10. `search_documentation`: Curated language documentation and idiom search across 9 languages.
11. `get_repository_history`: Aggregated engineering telemetry overview across all dimensions.
12. `get_test_history`: Authentic recorded test execution runs and failure frequencies over time.
13. `get_build_history`: Build success rates, durations, and CI failure steps.
14. `get_security_history`: Security advisories and static analysis findings.
15. `get_dependency_history`: Package inventory, version drift, and known vulnerabilities.
16. `get_performance_history`: API durations and P95 latency measurements.
17. `get_change_hotspots`: Frequently modified modules and churn correlation scores.
18. `get_maintenance_history`: Chronological record of past bug fixes and emergency patches.

---

## 5. Evolutionary Roadmap (Stages 1 through 10)

| Stage | Name | Description | Status |
|:---:|:---|:---|:---:|
| **Stage 1** | Single AI Agent | Static code analysis (*Analyze → Explain → Fix*) | ✓ Completed |
| **Stage 2** | Agent + Execution Tool | Connected to sandbox runner with self-correction feedback loop | ✓ Completed |
| **Stage 3** | 5-Agent Multi-Agent System | Manager, Analyzer, Fixer, Tester, Reviewer cooperation | ✓ Completed |
| **Stage 4** | Multi-Agent + MCP | Standardized MCP Server with developer tools & live activity audit | ✓ Completed |
| **Stage 5** | Transformer Lab | Custom decoder-only Transformer built and trained from scratch on CPU | ✓ Completed |
| **Stage 6** | Hybrid Model Routing | Intelligent router (Gemini ↔ Local Transformer ↔ Static Fallback) | ✓ Completed |
| **Stage 7** | Production Engineering | Sliding-window rate limits, JWT auth, request tracing, and live ops telemetry | ✓ Completed |
| **Stage 8** | Autonomous Repository Engineering | Multi-file repo scanning, bug reproduction, surgical patching, 0-regression checks, unified diffs & developer approval | ✓ Completed |
| **Stage 9** | Continuous Software Maintenance | Continuous signal ingestion, change hotspots, and test history tracking | ✓ Completed |
| **Stage 10** | **Predictive Software Engineering** | **Historical trend analysis, explainable risk models, evidence correlation, and preventive recommendations** | **● Active & Operational** |
| **Stage 11** | **Continuous Integration & CD Gate** | **12-stage deterministic pipeline, Render deployment hook, live health checks, and CI/CD operations dashboard** | **● Active & Verified** |

---

## 6. Continuous Integration & Continuous Deployment (CI/CD)

DevFix AI includes an enterprise-grade, deterministic CI/CD pipeline orchestrated via GitHub Actions (`.github/workflows/ci.yml`) targeting production on Render:

```text
[Developer Push / PR]
       │
       ▼
[GitHub Actions CI]
  ├── 1. Checkout (actions/checkout@v4)
  ├── 2. Setup Node.js 22 (cached)
  ├── 3. Setup Python 3.10 (cached)
  ├── 4. npm ci (Strict package-lock.json)
  ├── 5. Python venv install (PyTorch CPU, NumPy, Matplotlib)
  ├── 6. Code Lint (npm run lint)
  ├── 7. Typecheck (npm run typecheck)
  ├── 8. Unit Tests (11 suites: npm run test:unit)
  ├── 9. Integration Tests (4 suites: npm run test:integration)
  ├── 10. Frontend Build (npm run build:frontend)
  ├── 11. Backend Bundle (npm run build:backend)
  └── 12. Docker Build Validation (PEP 668 compliant virtualenv)
       │
       ▼
 [CI Approval Gate]
       │
       ▼ (main branch only)
[Render CD Deployment]
  ├── 1. Trigger Deploy Hook (RENDER_DEPLOY_HOOK_URL)
  ├── 2. Live Health Verification Loop (GET /api/health)
  └── 3. Verified Rollout (or immediate alert & rollback)
```

### GitHub Repository Secrets:
- `RENDER_DEPLOY_HOOK_URL`: Deploy hook from Render service settings.
- `RENDER_HEALTH_CHECK_URL`: Production health endpoint (e.g. `https://devfix-ai.onrender.com/api/health`).
- `GEMINI_API_KEY`: API key for Google Gemini model router.

---

## 7. Verification & Automated Test Suite (15 Test Suites Passing)

```bash
# Run all 15 automated test suites
npm test

# Run unit tests only (11 suites)
npm run test:unit

# Run integration tests only (4 suites)
npm run test:integration
```

### Complete Suite Inventory:
1. `Unit: Request & Path Validator` — Language allowlists and path traversal detection.
2. `Unit: Secure Code Execution Sandbox` — Process isolation, resource limits, and language validation.
3. `Unit: Hybrid Intelligence Model Router` — Model selection, user overrides, and static fallback.
4. `Unit: MCP Server & Tool Registry` — Tool inventories, documentation queries, and input schemas.
5. `Unit: Repository Scanner & Path Safety` — Manifest parsing, framework detection, and secret exclusion.
6. `Unit: Patch System, Diffs & Checkpoints` — Checkpoints, atomic rollbacks, and unified diffs.
7. `Unit: Web Technologies Static Analysis & Linting` — HTML, CSS, JavaScript linting and DOM validation.
8. `Unit: Continuous Quality Service & Health Gates` — Automated quality score, health gates, and regression tracking.
9. `Unit: Prediction & Risk Engine` — Risk scoring, signal aggregation, confidence scoring, and unknown handling.
10. `Unit: MCP Prediction & Historical Telemetry Tools` — Phase 10 MCP tool inventory and query execution.
11. `Unit: CI/CD Pipeline & Live Health Gate Integrity` — Pipeline stage contracts, token security, and database health.
12. `Integration: Single-Snippet E2E Pipeline` — End-to-end off-by-one verification.
13. `Integration: Failure Modes & Watchdog Timeouts` — Infinite loop watchdog `SIGKILL` termination.
14. `Integration: Autonomous Repository Workflow` — Full Section 38 repository workflow (reproduction to approval).
15. `Integration: Predictive Workflow & Recommendation Decisions` — End-to-end predictive pipeline and recommendation transitions.

---

## 8. Local Run & Verification Instructions

```bash
# Deterministic clean install
npm ci

# Run TypeScript linter and typechecker
npm run lint
npm run typecheck

# Run test suites
npm test

# Build frontend and backend
npm run build:frontend
npm run build:backend

# Start development server on port 3000
npm run dev

# Verify health endpoint live
curl -s http://localhost:3000/api/health | jq
```

Navigate to `http://localhost:3000`, open **Production Dashboard**, and scroll to **CI/CD Pipeline & Deployment Orchestration** to monitor live runs, probe endpoints, or trigger local pre-flight checks.
