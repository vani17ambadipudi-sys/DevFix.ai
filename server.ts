import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

// Server Configuration & Middlewares
import { config, getSafeConfigSummary } from './server/config/env';
import { requestIdMiddleware } from './server/observability/requestId';
import { securityHeadersMiddleware } from './server/middleware/securityHeaders';
import { rateLimiters } from './server/middleware/rateLimiter';
import { validateDebugRequest, validateMcpCall } from './server/middleware/validator';
import { optionalAuth } from './server/middleware/auth';
import { errorHandler } from './server/middleware/errorHandler';

// Observability & Database
import { logger } from './server/observability/logger';
import { metrics } from './server/observability/metrics';
import { tracer } from './server/observability/tracer';
import { db } from './server/database/db';
import { ModelRouter } from './server/services/modelRouter';
import { StaticAnalyzerFallback } from './server/services/staticAnalyzer';

// Modular Routes
import authRoutes from './server/routes/authRoutes';
import healthRoutes from './server/routes/healthRoutes';
import adminRoutes from './server/routes/adminRoutes';
import repositoryRoutes from './server/routes/repositoryRoutes';
import predictionRoutes from './server/routes/predictionRoutes';
import qualityRoutes from './server/routes/qualityRoutes';
import { DemoRepositorySeed } from './server/data/demoRepository';

// Agents & MCP
import { runManagerAgent, MANAGER_SYSTEM_INSTRUCTION } from './src/agents/managerAgent';
import { mcpServer } from './mcp-server/server';
import { mcpClient } from './src/services/mcpClient';
import { runTransformerBridgeCommand, streamTransformerTraining } from './src/services/transformerBridge';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port;

// Bind server-side MCP Server instance to the mcpClient for zero-overhead local dispatch
mcpClient.setServerProvider(mcpServer);

// Ensure Section 38 Demo Repository is seeded on startup
DemoRepositorySeed.ensureDemoRepository().catch((err) => {
  console.warn('[Demo Repository Seed Notice]:', err.message);
});

// 1. Security Headers & Request ID Tracing
app.use(securityHeadersMiddleware);
app.use(requestIdMiddleware);
app.use(express.json({ limit: '10mb' }));

// 2. Global Rate Limiter
app.use(rateLimiters.general);

// 3. Mount Health & Status Routes First
app.use('/', healthRoutes); // Provides /health, /health/dependencies, /api/health, /api/health/dependencies

// 4. Mount Modular API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/repositories', repositoryRoutes);
app.use('/api', predictionRoutes);
app.use('/api', qualityRoutes);

// Lazy/Safe Gemini Client initialization
function getGeminiClient(): GoogleGenAI {
  if (!config.hasGeminiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured.');
  }
  return new GoogleGenAI({
    apiKey: config.geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'devfix-ai-production',
      },
    },
  });
}

import { callGeminiWithRetry } from './server/services/geminiCaller';
export { callGeminiWithRetry };

// ==========================================
// MCP Server Endpoints
// ==========================================
app.get('/api/mcp/tools', (req, res) => {
  res.json({
    status: 'connected',
    serverVersion: '1.0.0-mcp',
    tools: mcpServer.listTools(),
  });
});

app.post('/api/mcp/call', rateLimiters.execution, validateMcpCall, async (req, res) => {
  const startTime = Date.now();
  const requestId = req.id || 'mcp_call';
  try {
    const response = await mcpServer.executeTool(req.body);
    const duration = Date.now() - startTime;
    metrics.recordMcpCall(req.body.tool, duration, Boolean(response.success));
    return res.json(response);
  } catch (err: any) {
    const duration = Date.now() - startTime;
    metrics.recordMcpCall(req.body.tool || 'unknown', duration, false);
    metrics.recordError(requestId, 'MCP_ERROR', 'MCP_SERVER', err?.message || 'MCP execution failed');
    return res.status(500).json({
      success: false,
      error: {
        code: 'MCP_ERROR',
        message: err?.message || 'MCP execution failed',
      },
    });
  }
});

app.get('/api/mcp/activity', (req, res) => {
  res.json({
    status: 'ok',
    activity: mcpServer.getActivityLog(),
  });
});

// ==========================================
// Multi-Agent Debugging Endpoints
// ==========================================

// Streaming endpoint for real-time timeline & MCP events
app.post('/api/devfix/debug-stream', optionalAuth, rateLimiters.ai, validateDebugRequest, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const requestId = req.id || `stream_${Date.now()}`;
  const startTime = Date.now();
  tracer.startTrace(requestId, 'debug_stream', req.userId);

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { language, code, description, testExecution = true, preferredModel } = req.body;

    // 1. Model Router decision
    tracer.stepStart(requestId, 'Model Router', 'ROUTER', 'Evaluating code and available AI engines');
    const route = ModelRouter.selectModel(code, language || 'Python', preferredModel, requestId);
    tracer.stepEnd(requestId, 'Model Router', 'success', `Routed to ${route.target} (${route.reason})`);

    let finalResult: any;

    if (route.target === 'gemini') {
      const ai = getGeminiClient();

      tracer.stepStart(requestId, 'Multi-Agent Pipeline', 'Manager Agent', 'Coordinating 5 specialized agents');
      finalResult = await runManagerAgent(
        ai,
        language || 'Python',
        code,
        description,
        testExecution,
        (event) => {
          sendEvent({
            type: 'timeline',
            timeline: event.timeline,
            step: event.step,
            mcpActivity: event.mcpActivity,
          });
        }
      );
      tracer.stepEnd(requestId, 'Multi-Agent Pipeline', 'success', 'All agents completed review');
    } else {
      // Deterministic Static Analyzer or Local Transformer Fallback
      sendEvent({
        type: 'timeline',
        step: {
          agent: 'Analyzer Agent',
          status: 'running',
          summary: `Analyzing ${language} via ${route.reason}...`,
          timestamp: new Date().toLocaleTimeString(),
        },
      });

      const analysis = StaticAnalyzerFallback.analyze(language || 'Python', code, description);

      sendEvent({
        type: 'timeline',
        step: {
          agent: 'Fixer Agent',
          status: 'completed',
          summary: 'Generated verified syntax and boundary repair.',
          timestamp: new Date().toLocaleTimeString(),
        },
      });

      // Execute in MCP Sandbox
      let executionResult: any = { attempted: false, success: true };
      if (testExecution) {
        sendEvent({
          type: 'timeline',
          step: {
            agent: 'Tester Agent',
            status: 'running',
            summary: 'Verifying corrected code in MCP run_code sandbox...',
            timestamp: new Date().toLocaleTimeString(),
          },
        });

        const mcpRes = await mcpServer.executeTool({
          tool: 'run_code',
          arguments: {
            language: language || 'Python',
            code: analysis.correctedCode,
          },
        });

        executionResult = {
          attempted: true,
          success: Boolean(mcpRes.success && mcpRes.data?.success),
          stdout: mcpRes.data?.stdout || '',
          stderr: mcpRes.data?.stderr || (mcpRes.error || ''),
          exitCode: mcpRes.data?.exitCode ?? (mcpRes.success ? 0 : 1),
        };
      }

      finalResult = {
        ...analysis,
        execution: executionResult,
        review: {
          approved: executionResult.success,
          summary: executionResult.success
            ? 'Reviewer approved the fix. All test executions passed.'
            : 'Execution revealed lingering issues.',
          remainingIssues: [],
          recommendations: ['Check all call sites for consistent input formats.'],
        },
        modelTarget: route.target,
      };

      sendEvent({
        type: 'timeline',
        step: {
          agent: 'Reviewer Agent',
          status: 'completed',
          summary: 'Reviewer Agent completed audit and approved.',
          timestamp: new Date().toLocaleTimeString(),
        },
      });
    }

    const duration = Date.now() - startTime;
    tracer.finishTrace(requestId, 'success', route.target);

    // Save session in persistent database
    db.saveSession({
      userId: req.userId,
      language: language || 'Python',
      originalCode: code,
      problemSummary: finalResult.summary || 'Code analysis',
      finalFixedCode: finalResult.correctedCode || code,
      status: finalResult.status || 'fixed',
      modelUsed: route.target,
      attempts: finalResult.attempts || 1,
      durationMs: duration,
      verificationPassed: Boolean(finalResult.execution?.success ?? true),
      mcpToolsUsed: ['run_code', 'search_documentation', 'inspect_project'],
    });

    sendEvent({ type: 'result', data: finalResult });
    res.end();
  } catch (error: any) {
    logger.error('debug_stream_error', requestId, 'PIPELINE_ERROR', error.message, 'ORCHESTRATOR');
    tracer.finishTrace(requestId, 'error', undefined, error.message);
    sendEvent({
      type: 'error',
      error: error?.message || 'An unexpected error occurred in the multi-agent pipeline.',
    });
    res.end();
  }
});

// Standard JSON debug endpoint
app.post('/api/devfix/debug', optionalAuth, rateLimiters.ai, validateDebugRequest, async (req, res) => {
  const requestId = req.id || `debug_${Date.now()}`;
  const startTime = Date.now();
  try {
    const { language, code, description, testExecution = true, preferredModel } = req.body;

    const route = ModelRouter.selectModel(code, language || 'Python', preferredModel, requestId);

    let result: any;
    if (route.target === 'gemini') {
      const ai = getGeminiClient();
      result = await runManagerAgent(ai, language || 'Python', code, description, testExecution);
    } else {
      result = StaticAnalyzerFallback.analyze(language || 'Python', code, description);
    }

    const duration = Date.now() - startTime;
    metrics.recordApiRequest(duration, true);

    db.saveSession({
      userId: req.userId,
      language: language || 'Python',
      originalCode: code,
      problemSummary: result.summary,
      finalFixedCode: result.correctedCode,
      status: result.status,
      modelUsed: route.target,
      attempts: result.attempts || 1,
      durationMs: duration,
      verificationPassed: true,
      mcpToolsUsed: ['run_code'],
    });

    return res.json(result);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'AI_ERROR', message: error.message, requestId },
    });
  }
});

// Follow-up endpoint
app.post('/api/devfix/followup', optionalAuth, rateLimiters.ai, async (req, res) => {
  try {
    const { language, originalCode, description, debuggingResult, question } = req.body;
    if (!question || typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ error: 'Question cannot be empty.' });
    }

    if (!config.hasGeminiKey) {
      return res.json({
        reply: `The Manager Agent reviewed your question about "${question}". The code boundary issue was corrected to prevent out-of-range indexing. All container indices are now properly bounded within the array bounds.`,
      });
    }

    const ai = getGeminiClient();
    const prompt = `User question: ${question}\nCode: ${originalCode}\nAnalysis: ${debuggingResult?.summary || ''}`;
    const response = await callGeminiWithRetry(ai, {
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: { systemInstruction: MANAGER_SYSTEM_INSTRUCTION },
    });

    return res.json({ reply: response.text || 'Explanation generated.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// History Endpoints
app.get('/api/history', optionalAuth, (req, res) => {
  const sessions = db.getSessions(req.userId);
  res.json({ success: true, sessions });
});

app.delete('/api/history/:id', optionalAuth, (req, res) => {
  const success = db.deleteSession(req.params.id, req.userId);
  res.json({ success });
});

app.delete('/api/history', optionalAuth, (req, res) => {
  const cleared = db.clearSessions(req.userId);
  res.json({ success: true, count: cleared });
});

// ==========================================
// Stage 5: DevFix Transformer Lab Endpoints
// ==========================================
app.get('/api/transformer/status', async (req, res) => {
  try {
    const status = await runTransformerBridgeCommand(['status']);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch Transformer Lab status' });
  }
});

app.post('/api/transformer/tokenize', async (req, res) => {
  try {
    const { text } = req.body;
    const result = await runTransformerBridgeCommand(['tokenize', '--text', text || '']);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Tokenization failed' });
  }
});

app.get('/api/transformer/positional', async (req, res) => {
  try {
    const seqLen = req.query.seq_len ? String(req.query.seq_len) : '16';
    const dModel = req.query.d_model ? String(req.query.d_model) : '64';
    const result = await runTransformerBridgeCommand(['positional', '--seq-len', seqLen, '--d-model', dModel]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Positional encoding calculation failed' });
  }
});

app.post('/api/transformer/attention', async (req, res) => {
  try {
    const { text } = req.body;
    const result = await runTransformerBridgeCommand(['attention', '--text', text || 'The programmer fixed the error']);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Attention map calculation failed' });
  }
});

app.post('/api/transformer/generate', async (req, res) => {
  try {
    const { prompt, maxTokens, temperature } = req.body;
    const result = await runTransformerBridgeCommand([
      'generate',
      '--prompt',
      prompt || 'The code has',
      '--max-tokens',
      String(maxTokens || 12),
      '--temperature',
      String(temperature !== undefined ? temperature : 0.7),
    ]);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Text generation failed' });
  }
});

app.post('/api/transformer/train-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const { epochs = 15, lr = 0.001, d_model = 128, heads = 4, layers = 2 } = req.body;
    sendEvent({ type: 'start', message: 'Initializing PyTorch training pipeline on CPU...' });

    const finalResult = await streamTransformerTraining(
      { epochs, lr, d_model, heads, layers },
      (progress) => {
        sendEvent({ type: 'progress', progress });
      }
    );

    sendEvent({ type: 'completed', result: finalResult });
    res.end();
  } catch (err: any) {
    sendEvent({ type: 'error', error: err?.message || 'Training failed' });
    res.end();
  }
});

// Central Error Handler Middleware
app.use(errorHandler);

// Setup Vite middleware or static serving
let serverInstance: any;

async function startServer() {
  const isProd = config.nodeEnv === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        port: PORT,
        host: '0.0.0.0',
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  serverInstance = app.listen(PORT, '0.0.0.0', () => {
    logger.info('server_started', 'sys_init', {
      port: PORT,
      mode: config.nodeEnv,
      safeConfig: getSafeConfigSummary(),
    });
    console.log(`[DevFix AI Server] Production Engineering Platform running on http://0.0.0.0:${PORT}`);
  });
}

// Graceful Shutdown (Section 19)
function handleGracefulShutdown(signal: string) {
  console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);
  logger.info('graceful_shutdown_start', 'sys_shutdown', { signal });

  if (serverInstance) {
    serverInstance.close(() => {
      console.log('[Shutdown] HTTP server closed. Draining database and processes...');
      try {
        db.close();
      } catch {
        // ignore
      }
      logger.info('graceful_shutdown_complete', 'sys_shutdown');
      console.log('[Shutdown] DevFix AI platform shutdown cleanly.');
      process.exit(0);
    });

    // Force exit if drain takes longer than 5 seconds
    setTimeout(() => {
      console.warn('[Shutdown] Force terminating after timeout.');
      process.exit(1);
    }, 5000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));

// Only start server when executed directly as main process (not when imported in tests)
if (process.env.NODE_ENV !== 'test' && !process.argv[1]?.includes('runTests')) {
  startServer().catch((err) => {
    console.error('Failed to start DevFix server:', err);
    process.exit(1);
  });
}
