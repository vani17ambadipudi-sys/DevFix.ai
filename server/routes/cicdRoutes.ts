import { Router, Request, Response } from 'express';
import { CicdService } from '../services/cicdService';
import { logger } from '../observability/logger';
import { rateLimiters } from '../middleware/rateLimiter';
import { spawn } from 'child_process';

const router = Router();

// 1. Get Live CI/CD Pipeline Status
router.get('/status', rateLimiters.general, async (req: Request, res: Response) => {
  try {
    const status = await CicdService.getPipelineStatus();
    res.json({ success: true, data: status });
  } catch (err: any) {
    logger.error('cicd_route_error', 'cicd_status', 'ERR_CICD_STATUS', err.message, 'cicdRouter');
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Active Health Check Probe for Production Deployment
router.get('/health-check', rateLimiters.general, async (req: Request, res: Response) => {
  try {
    const targetUrl = (req.query.url as string) || undefined;
    const result = await CicdService.verifyHealthEndpoint(targetUrl);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Simulate Full Local CI Run (Developer Verification Gateway)
router.post('/simulate-local-ci', rateLimiters.general, async (req: Request, res: Response) => {
  const steps: Array<{ name: string; command: string; args: string[] }> = [
    { name: 'Lint', command: 'npm', args: ['run', 'lint'] },
    { name: 'TypeScript Typecheck', command: 'npm', args: ['run', 'typecheck'] },
    { name: 'Unit Tests', command: 'npm', args: ['run', 'test:unit'] },
    { name: 'Integration Tests', command: 'npm', args: ['run', 'test:integration'] },
    { name: 'Frontend Build', command: 'npm', args: ['run', 'build:frontend'] },
    { name: 'Backend Build', command: 'npm', args: ['run', 'build:backend'] },
  ];

  const results: Array<{
    name: string;
    passed: boolean;
    durationMs: number;
    output?: string;
  }> = [];

  let allPassed = true;

  for (const step of steps) {
    const start = Date.now();
    try {
      const stepResult = await new Promise<{ passed: boolean; output: string }>((resolve) => {
        const proc = spawn(step.command, step.args, {
          shell: true,
          env: { ...process.env, CI: 'true' },
        });

        let out = '';
        proc.stdout?.on('data', (d) => {
          out += d.toString();
        });
        proc.stderr?.on('data', (d) => {
          out += d.toString();
        });

        proc.on('close', (code) => {
          resolve({ passed: code === 0, output: out.slice(-1500) });
        });

        proc.on('error', (err) => {
          resolve({ passed: false, output: err.message });
        });
      });

      const durationMs = Date.now() - start;
      results.push({
        name: step.name,
        passed: stepResult.passed,
        durationMs,
        output: stepResult.output,
      });

      if (!stepResult.passed) {
        allPassed = false;
        break; // Stop pipeline on first failure
      }
    } catch (err: any) {
      results.push({
        name: step.name,
        passed: false,
        durationMs: Date.now() - start,
        output: err.message,
      });
      allPassed = false;
      break;
    }
  }

  res.json({
    success: true,
    data: {
      allPassed,
      totalDurationMs: results.reduce((acc, r) => acc + r.durationMs, 0),
      stepsCount: steps.length,
      executedSteps: results,
      timestamp: new Date().toISOString(),
    },
  });
});

export default router;
