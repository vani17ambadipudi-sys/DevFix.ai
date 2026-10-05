# DevFix AI Platform — REST & Streaming API Documentation

## 1. Authentication Endpoints

### `POST /api/auth/register`
Creates a new developer account.
* **Rate limit**: 15 req/min
* **Body**:
  ```json
  { "email": "dev@example.com", "password": "SecurePassword123!", "name": "Jane Dev" }
  ```
* **Response (201 Created)**:
  ```json
  { "success": true, "user": { "id": "usr_...", "email": "dev@example.com" }, "token": "jwt..." }
  ```

### `POST /api/auth/login`
Authenticates existing user and issues JWT token.
* **Rate limit**: 15 req/min
* **Body**:
  ```json
  { "email": "dev@example.com", "password": "SecurePassword123!" }
  ```

---

## 2. Multi-Agent Debugging Endpoints

### `POST /api/devfix/debug-stream` (Server-Sent Events)
Streams real-time agent coordination timeline and execution results.
* **Headers**: `Accept: text/event-stream`, `Authorization: Bearer <token>` (optional)
* **Body**:
  ```json
  {
    "language": "Python",
    "code": "print(10 + 20)",
    "description": "Optional bug description",
    "testExecution": true,
    "preferredModel": "gemini"
  }
  ```
* **Events**:
  * `type: "timeline"` — Real-time agent status events.
  * `type: "result"` — Final verified debugging report.
  * `type: "error"` — Structured error details.

---

## 3. Model Context Protocol (MCP) Endpoints

### `GET /api/mcp/tools`
Lists all registered MCP tools and their JSON schemas.

### `POST /api/mcp/call`
Executes an MCP tool in the sandbox.
* **Body**:
  ```json
  {
    "tool": "run_code",
    "arguments": {
      "language": "Python",
      "code": "print('Hello MCP')"
    }
  }
  ```

---

## 4. Telemetry & Health Endpoints

### `GET /api/health`
Returns system status, version, and uptime.

### `GET /api/health/dependencies`
Returns dependency availability (Database, Gemini, Transformer, MCP server).

### `GET /api/admin/metrics`
Returns real-time latency distributions and agent stats.

### `POST /api/admin/run-e2e-demo`
Executes the Section 38 canonical end-to-end verification pipeline.
