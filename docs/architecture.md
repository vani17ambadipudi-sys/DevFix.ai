# DevFix AI Platform — Architecture Specification

## 1. System Overview

DevFix AI is a production engineering platform combining:
* **Multi-Agent Coordination** (Manager, Analyzer, Fixer, Tester, Reviewer)
* **Standardized Model Context Protocol (MCP)** tool execution
* **Local PyTorch Transformer Lab** (decoder-only model trained from scratch)
* **Hybrid Model Routing** (Gemini 3.8 Flash $\leftrightarrow$ Local Transformer $\leftrightarrow$ Static Analysis Fallback)
* **Production Operations** (Structured logging, distributed tracing, tiered rate limiting, sandboxed subprocess execution, and live telemetry)

---

## 2. End-to-End Architecture Diagram

```mermaid
flowchart TD
    User([Developer / Client]) -->|HTTPS / REST| Gateway[API Gateway & Express Server]

    subgraph Security Layer
        Gateway --> SecHeaders[Security Headers & CORS]
        SecHeaders --> ReqId[X-Request-Id Generator]
        ReqId --> RateLimit[Sliding Window Rate Limiter]
        RateLimit --> Validator[Schema & Path Traversal Validator]
        Validator --> Auth[JWT & Scrypt Auth Middleware]
    end

    Auth --> Orch[DevFix Orchestrator]

    subgraph Model Router
        Orch --> Router{Model Router}
        Router -->|Primary: Complex / General| Gemini[Gemini 3.8 Flash]
        Router -->|Local / Educational| LocalTF[PyTorch Transformer Lab]
        Router -->|Fallback / Offline| Static[Static Rule-Based Analyzer]
    end

    subgraph Multi-Agent Verification Pipeline
        Gemini --> Manager[Manager Agent]
        LocalTF --> Manager
        Static --> Manager
        Manager --> Analyzer[Analyzer Agent]
        Analyzer --> Fixer[Fixer Agent]
        Fixer --> Tester[Tester Agent]
        Tester --> MCPClient[MCP Client]
        MCPClient --> MCPServer[DevFix MCP Server]
        MCPServer --> Tool1[run_code (Sandbox)]
        MCPServer --> Tool2[read_project_file]
        MCPServer --> Tool3[inspect_project]
        MCPServer --> Tool4[search_docs]
        Tool1 --> Reviewer[Reviewer Agent]
        Reviewer --> VerifiedResult[Verified Fixed Code & Report]
    end

    subgraph Observability & Storage
        VerifiedResult --> Logger[Structured JSON Logger]
        VerifiedResult --> Metrics[Real-time Metrics Collector]
        VerifiedResult --> Tracer[Distributed Request Tracer]
        VerifiedResult --> Database[(Persistent JSON Database)]
    end

    Database --> AdminDashboard[Production Operations Dashboard]
    Metrics --> AdminDashboard
    Tracer --> AdminDashboard
    Logger --> AdminDashboard
```

---

## 3. Component Breakdown

| Layer | Component | Description |
|:---|:---|:---|
| **Security** | `requestIdMiddleware` | Attaches a unique request ID (`req_...`) for distributed tracing. |
| **Security** | `createRateLimiter` | Tiered token buckets preventing endpoint exhaustion. |
| **Security** | `SecureSandbox` | Temporary directory creation, environment sanitization, and watchdog timeouts. |
| **Routing** | `ModelRouter` | Automatically selects Gemini, Local Transformer, or Static Fallback. |
| **Agents** | 5 Cooperating Agents | Iterative bug discovery, code repair, sandbox execution, and final signoff. |
| **Tools** | MCP Server | Standardized Model Context Protocol exposing 4 sandboxed developer tools. |
| **ML Engine** | Transformer Lab | Custom PyTorch model with Sinusoidal Positional Encoding and Multi-Head Attention. |
| **Telemetry** | `metrics` & `tracer` | Real measured API latencies, agent durations, and recent error ring buffers. |
