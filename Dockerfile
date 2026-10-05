# ==========================================
# DevFix AI Platform — Production Dockerfile
# ==========================================

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production Runtime
FROM node:22-slim AS runner
WORKDIR /app

# Install lightweight Python runtime for Transformer Lab & Sandboxed execution
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU and NumPy
RUN python3 -m pip install --no-cache-dir --upgrade pip && \
    python3 -m pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    python3 -m pip install --no-cache-dir numpy matplotlib

# Create non-root user for process safety
RUN groupadd -g 1001 devfixgroup && \
    useradd -u 1001 -g devfixgroup -m -s /bin/bash devfixuser

# Install production node dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application files
COPY --chown=devfixuser:devfixgroup --from=builder /app/dist ./dist
COPY --chown=devfixuser:devfixgroup . .

# Set permissions
RUN mkdir -p /app/data /tmp/devfix_sandboxes && \
    chown -R devfixuser:devfixgroup /app /tmp/devfix_sandboxes

USER devfixuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

CMD ["npx", "tsx", "server.ts"]
