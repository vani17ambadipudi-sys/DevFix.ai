# DevFix AI Platform — Observability & Monitoring Specification

## 1. Observability Pillars

DevFix AI implements production-grade observability across **Logs**, **Metrics**, and **Traces**.

### A. Structured Logging (`server/observability/logger.ts`)
Every operation outputs structured JSON:
```json
{
  "timestamp": "2026-10-02T15:12:29.657Z",
  "requestId": "req_1790953949630",
  "operation": "debug_code",
  "status": "success",
  "durationMs": 182,
  "component": "ORCHESTRATOR",
  "metadata": {
    "modelRouted": "gemini",
    "stepsCount": 5
  }
}
```
**Sanitization Rules**:
* Keys matching `password`, `token`, `secret`, `apikey`, `key`, `authorization` are automatically replaced with `[REDACTED]`.
* Output strings exceeding 500 characters are truncated.
* Internal stack traces are never exposed in log outputs or client responses.

---

### B. Real-Time Metrics Collector (`server/observability/metrics.ts`)
Calculates real measured statistics (not simulated):
* **API Latency**: Min, Max, and Average duration across requests.
* **AI Latency**: Gemini inference time, Transformer generation time.
* **Agent Execution Times**:
  * Manager Agent
  * Analyzer Agent
  * Fixer Agent
  * Tester Agent
  * Reviewer Agent
* **MCP Tool Metrics**: Total invocations, success count, failure count, average duration.
* **Model Routing Distribution**: Gemini vs Local Transformer vs Static Analysis Fallback.
* **Error Ring Buffer**: Retains the last 50 error events with `requestId`, `errorCode`, `component`, and sanitized messages.

---

### C. Distributed Tracing (`server/observability/tracer.ts`)
Tracks request journeys using a unified `X-Request-Id`:

$$\text{User Request} \to \text{Request ID} \to \text{API Gateway} \to \text{Model Router} \to \text{Agents} \to \text{MCP} \to \text{Execution} \to \text{Reviewer} \to \text{Final Result}$$

Every intermediate agent step logs `startTime`, `endTime`, `durationMs`, and status.
Traces can be audited in real-time on the **Production Operations Dashboard**.
