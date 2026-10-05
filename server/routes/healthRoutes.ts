import { Router, Request, Response } from 'express';
import { config } from '../config/env';
import { mcpServer } from '../../mcp-server/server';
import fs from 'fs';

const router = Router();
const startTime = Date.now();

const handleHealth = (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'DevFix AI Production Platform',
    version: '7.0.0-prod',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
  });
};

const handleHealthDeps = async (req: Request, res: Response) => {
  // 1. Database Check
  let dbStatus = 'healthy';
  try {
    const dbExists = fs.existsSync(config.databasePath) || fs.existsSync('./data');
    dbStatus = dbExists ? 'healthy' : 'degraded';
  } catch {
    dbStatus = 'degraded';
  }

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
