import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import { mcpServer } from '../../mcp-server/server';
import { db } from '../database/db';
import fs from 'fs';

const router = Router();
const startTime = Date.now();

const handleHealth = (req: Request, res: Response) => {
  const dbHealth = db.checkHealth();
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const isHealthy = dbHealth.status === 'healthy';

  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    application: {
      name: 'DevFix AI Production Platform',
      status: isHealthy ? 'healthy' : 'degraded',
      version: '7.0.0-prod',
      uptimeSeconds: uptime,
      environment: config.nodeEnv,
      nodeVersion: process.version,
    },
    api: {
      status: 'operational',
      port: config.port,
      rateLimitsConfigured: true,
      routesMounted: [
        '/api/auth',
        '/api/admin',
        '/api/repositories',
        '/api/prediction',
        '/api/quality',
        '/api/cicd',
        '/api/health',
      ],
    },
    database: {
      status: dbHealth.status,
      isLoaded: dbHealth.isLoaded,
      writable: dbHealth.writable,
      recordsCount: dbHealth.recordsCount,
      path: dbHealth.filePath,
      ...(dbHealth.error ? { error: dbHealth.error } : {}),
    },
    timestamp: new Date().toISOString(),
  });
};

const handleHealthDeps = async (req: Request, res: Response) => {
  // 1. Database Check (Actual Health and Writeability Check)
  const dbHealth = db.checkHealth();
  const dbStatus = dbHealth.status;

  // 2. Gemini Check
  const geminiStatus = config.hasGeminiKey ? 'available' : 'unconfigured_fallback_ready';

  // 3. Local Transformer Check
  let transformerStatus = 'available';
  try {
    const checkpointExists = fs.existsSync('./transformer-lab/checkpoints/tiny_transformer.pt');
    transformerStatus = checkpointExists ? 'available' : 'needs_training';
  } catch {
    transformerStatus = 'unavailable';
  }

  // 4. MCP Server Check
  const mcpStatus = mcpServer && mcpServer.listTools().length > 0 ? 'healthy' : 'unavailable';

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    dependencies: {
      database: dbStatus,
      gemini: geminiStatus,
      transformer: transformerStatus,
      mcp: mcpStatus,
    },
    toolsCount: mcpServer ? mcpServer.listTools().length : 0,
    modelRouter: {
      primary: config.hasGeminiKey ? 'Gemini 3.8 Flash' : 'Local Transformer & Static Analyzer',
      fallbackAvailable: true,
    },
  });
};

router.get('/health', handleHealth);
router.get('/api/health', handleHealth);

router.get('/health/dependencies', handleHealthDeps);
router.get('/api/health/dependencies', handleHealthDeps);

export default router;
