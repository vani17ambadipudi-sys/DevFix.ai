# DevFix AI Platform — CI/CD, Deployment & Infrastructure Guide

Comprehensive guide for the deterministic Continuous Integration (CI), Continuous Deployment (CD), containerization, and recovery operations for DevFix AI.

---

## 1. High-Level CI/CD Architecture

```text
DEVELOPER
   │
   ├── (git push / pull_request -> main)
   ▼
GITHUB ACTIONS CI PIPELINE (.github/workflows/ci.yml)
   │
   ├── 01. Checkout Source Code
   ├── 02. Setup Node.js 22 (with npm cache)
   ├── 03. Setup Python 3.10 (with pip cache)
   ├── 04. Deterministic Install: npm ci
   ├── 05. Install Python Runtime: PyTorch CPU, NumPy, Matplotlib
   ├── 06. Static Code Linting: npm run lint
   ├── 07. TypeScript Typecheck: npm run typecheck
   ├── 08. Unit Test Suite (11 suites, Stages 1-10 & CI Gates): npm run test:unit
   ├── 09. Integration Test Suite (4 suites): npm run test:integration
   ├── 10. Build Frontend Assets: npm run build:frontend (Vite)
   ├── 11. Build Backend Bundle: npm run build:backend (esbuild)
   ├── 12. Validate Docker Build: docker build with isolated Python venv
   │
   ▼
ALL 12 CI CHECKS PASS?
   ├── NO  ──► FAILED: Block PR / Abort CD Deployment (Zero broken code deployed)
   └── YES ──► MAIN BRANCH PUSH?
                 ├── NO (PR) ──► CI Green Signoff (Awaiting Review & Merge)
                 └── YES ────► CD STAGE: RENDER DEPLOYMENT
                                 │
                                 ├── 1. Trigger Deploy Hook (RENDER_DEPLOY_HOOK_URL)
                                 ├── 2. Poll Live Production Health Gate (/api/health)
                                 │      (24 attempts x 10s timeout, HTTP 200 check)
                                 ├── 3. Health Verified ──► DEPLOYMENT SUCCESS
                                 └── 4. Health Failed   ──► DEPLOYMENT FAILURE (Alert Team)
```

---

## 2. Deterministic Pipeline Stages

| Stage | Script / Action | Purpose |
| :--- | :--- | :--- |
| **01. Checkout** | `actions/checkout@v4` | Retrieves source tree with least-privilege token. |
| **02. Node.js 22** | `actions/setup-node@v4` | Configures Node 22 runtime and binds `package-lock.json` npm cache. |
| **03. Python 3.10** | `actions/setup-python@v5` | Configures Python 3.10 for sandbox & Transformer Lab, binds pip cache. |
| **04. NPM Clean Install** | `npm ci` | Strict, deterministic installation from committed `package-lock.json`. |
| **05. Python Dependencies** | `pip install ...` | Installs PyTorch CPU, NumPy, Matplotlib without system package breakage. |
| **06. Code Lint** | `npm run lint` | Ensures zero syntax anomalies or unused references. |
| **07. Typecheck** | `npm run typecheck` | Strict `tsc --noEmit` across full TypeScript codebase. |
| **08. Unit Tests** | `npm run test:unit` | Executes 11 unit test suites covering sandboxes, routers, MCP, and quality. |
| **09. Integration Tests**| `npm run test:integration` | Runs full multi-agent pipeline, failure modes, and autonomous repairs. |
| **10. Frontend Build** | `npm run build:frontend` | Generates minified Vite SPA bundle in `dist/`. |
| **11. Backend Build** | `npm run build:backend` | Bundles `server.ts` with `esbuild` into production `dist/server.js`. |
| **12. Docker Build** | `docker build .` | Validates multi-stage Docker build with PEP 668 compliant virtualenv. |

---

## 3. Continuous Deployment — Render Integration

### 3.1. Enforcing CI Approval Before Render Deployment
Render services by default may attempt to build automatically on every commit. **To ensure that unverified or broken code is NEVER deployed:**

1. Navigate to your **Render Dashboard** -> **DevFix Service** -> **Settings**.
2. Scroll to **Build & Deploy** -> **Auto-Deploy**.
3. Set **Auto-Deploy to "No"**.
4. In **Deploy Hook**, click **Create Deploy Hook**.
5. Copy the generated URL (format: `https://api.render.com/deploy/srv-xxxxxx?key=yyyyyy`).

This ensures Render deploys **strictly when triggered by the GitHub Actions CD job** after all 12 CI stages pass.

### 3.2. Required GitHub Repository Secrets
Navigate to **GitHub Repository** -> **Settings** -> **Secrets and variables** -> **Actions**:

| Secret Name | Required | Description |
| :--- | :--- | :--- |
| `RENDER_DEPLOY_HOOK_URL` | **Yes** | Webhook URL provided by Render to trigger production deployment. |
| `RENDER_HEALTH_CHECK_URL` | **Recommended** | Production URL to verify (e.g., `https://devfix-ai.onrender.com/api/health`). |
| `GEMINI_API_KEY` | Optional | Injected into Render environment variables for multi-agent capabilities. |
| `JWT_SECRET` | Optional | Production JWT secret (at least 32 characters). |

---

## 4. Production Docker Container Configuration

DevFix AI runs a multi-stage, non-root Docker build designed for security and PEP 668 compliance:

```dockerfile
# Stage 1: Build Frontend & Backend
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Runtime with PEP 668 Virtualenv
FROM node:22-slim AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv curl && rm -rf /var/lib/apt/lists/*

# Dedicated virtualenv avoids system Python breakage
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir numpy matplotlib

# Non-root user (UID 1001)
RUN groupadd -g 1001 devfixgroup && \
    useradd -u 1001 -g devfixgroup -m -s /bin/bash devfixuser && \
    chown -R devfixuser:devfixgroup /opt/venv

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=devfixuser:devfixgroup --from=builder /app/dist ./dist
COPY --chown=devfixuser:devfixgroup . .

USER devfixuser
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npx", "tsx", "server.ts"]
```

---

## 5. Live Production Health Monitoring (`GET /api/health`)

The health endpoint inspects live application telemetry and database writeability rather than returning static text:

```bash
curl -s http://localhost:3000/api/health | jq
```

Response format:
```json
{
  "status": "healthy",
  "application": {
    "name": "DevFix AI Production Platform",
    "status": "healthy",
    "version": "7.0.0-prod",
    "uptimeSeconds": 142,
    "environment": "production",
    "nodeVersion": "v22.14.0"
  },
  "api": {
    "status": "operational",
    "port": 3000,
    "rateLimitsConfigured": true,
    "routesMounted": [
      "/api/auth",
      "/api/admin",
      "/api/repositories",
      "/api/prediction",
      "/api/quality",
      "/api/cicd",
      "/api/health"
    ]
  },
  "database": {
    "status": "healthy",
    "isLoaded": true,
    "writable": true,
    "recordsCount": 48,
    "path": "./data/devfix.json"
  },
  "timestamp": "2026-11-04T02:50:00.000Z"
}
```

---

## 6. Local Developer Pre-Flight Testing

Before committing or pushing code, verify all stages locally:

```bash
# 1. Deterministic install
npm ci

# 2. Code linting
npm run lint

# 3. TypeScript typecheck
npm run typecheck

# 4. Unit tests
npm run test:unit

# 5. Integration tests
npm run test:integration

# 6. Production frontend build
npm run build:frontend

# 7. Production backend bundle
npm run build:backend

# 8. All test suites together
npm test
```

Developers can also run pre-flight verification directly from the **Production Operations Dashboard** via the **"Run Pre-Flight CI Checks"** button.

---

## 7. Rollback and Disaster Recovery Procedures

### 7.1. Immediate Render Rollback
If a deployment exhibits regressions in production:
1. Open the **Render Dashboard** -> **DevFix Service** -> **Events / Deploys**.
2. Locate the previous successful deploy.
3. Click **Rollback to this deploy**.
4. Render immediately points live traffic back to the prior immutable Docker container.

### 7.2. Git Revert Trigger
To permanently revert via CI/CD:
```bash
git revert HEAD -m 1
git push origin main
```
The GitHub Actions workflow will execute all 12 validation stages on the reverted commit and trigger a clean Render deployment.

### 7.3. Database Checkpoint Recovery
DevFix AI captures automatic workspace and database checkpoints prior to every patch application:
- Automatic checkpoints are stored under `data/checkpoints/` and in the database store.
- Revert any individual patch via the **Repository Debugger** or via `POST /api/repositories/:id/rollback-checkpoint`.
