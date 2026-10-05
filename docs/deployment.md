# DevFix AI Platform — Deployment Guide

## 1. Quickstart (Local Development)

```bash
# 1. Clone repository and install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env and supply GEMINI_API_KEY (optional, fallback available)

# 3. Train the local Transformer Lab checkpoint (takes ~5 seconds on CPU)
cd transformer-lab && python3 train.py --epochs 20 && cd ..

# 4. Run automated test suite
npm test

# 5. Start development server
npm run dev
# Server listening on http://localhost:3000
```

---

## 2. Docker Deployment

DevFix AI includes a multi-stage production Dockerfile and Docker Compose orchestration:

```bash
# Build and run containerized platform
docker-compose up --build -d

# Verify container health
docker-compose ps

# Inspect logs
docker-compose logs -f
```

The container runs as a non-privileged `devfixuser` (UID 1001), bundles PyTorch CPU, exposes port 3000, and verifies health via `curl -f http://localhost:3000/api/health`.

---

## 3. Production Environment Checklist

1. **`NODE_ENV=production`**: Enables static frontend asset serving and strict secret validation.
2. **`JWT_SECRET`**: Set a cryptographically random string (at least 32 characters).
3. **`GEMINI_API_KEY`**: Provide valid Google Gen AI API key for multi-agent capabilities.
4. **`EXECUTION_TIMEOUT_MS`**: Configure maximum allowed sandbox execution time (e.g., 6000ms).
5. **`RATE_LIMIT_*`**: Tune tiered limits based on expected traffic load.
6. **Health Monitoring**: Configure your reverse proxy (Nginx, Traefik, Cloud Run) to poll `/api/health` and `/api/health/dependencies`.
