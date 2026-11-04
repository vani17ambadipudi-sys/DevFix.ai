# ==============================================================================
# DevFix AI Platform — Production Multi-Stage Dockerfile
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend Assets
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app

# Deterministic build dependency installation
COPY package*.json ./
RUN npm ci

# Copy source and produce optimized production bundle
COPY . .
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Runtime
# ------------------------------------------------------------------------------
FROM node:22-slim AS runner
WORKDIR /app

# 1. System packages: Install Python runtime, venv tooling, and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 2. Virtual Environment Configuration (Resolves PEP 668 'externally-managed-environment')
# Dedicated venv isolates packages from Debian system Python and prevents package conflicts
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1

# 3. Python Dependencies: Install PyTorch (CPU-optimized) and required scientific libraries
COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# 4. Process Security: Create dedicated unprivileged non-root user
RUN groupadd -g 1001 devfixgroup && \
    useradd -u 1001 -g devfixgroup -m -s /bin/bash devfixuser

# 5. Grant non-root user ownership of the virtual environment for runtime execution
RUN chown -R devfixuser:devfixgroup /opt/venv

# 6. Node.js Production Dependencies: Deterministic installation via npm ci
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 7. Application Code: Copy built frontend assets and server application
COPY --chown=devfixuser:devfixgroup --from=builder /app/dist ./dist
COPY --chown=devfixuser:devfixgroup . .

# 8. Directory Setup: Ensure SQLite data and sandbox scratchpads have correct permissions
RUN mkdir -p /app/data /tmp/devfix_sandboxes && \
    chown -R devfixuser:devfixgroup /app /tmp/devfix_sandboxes

# Switch to non-root user
USER devfixuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Container Healthcheck verifying the active /api/health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Launch production server
CMD ["npx", "tsx", "server.ts"]
