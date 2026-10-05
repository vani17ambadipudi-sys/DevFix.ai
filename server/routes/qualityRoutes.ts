import { Router, Request, Response } from 'express';
import { ContinuousQualityService } from '../../src/services/qualityService';
import { logger } from '../observability/logger';
import { metrics } from '../observability/metrics';

const router = Router();

// GET /api/quality/status
router.get('/quality/status', (req: Request, res: Response) => {
  const repoId = (req.query.repositoryId as string) || 'repo_demo_01';
  try {
    const qualityMetrics = ContinuousQualityService.getQualityMetrics(repoId);
    return res.json({
      success: true,
      metrics: qualityMetrics,
    });
  } catch (err: any) {
    logger.error('quality_metrics_fetch_failed', req.id || 'q_status', 'QUALITY_ERROR', err.message, 'QualityService');
    return res.status(500).json({
      success: false,
      error: { code: 'QUALITY_STATUS_ERROR', message: err.message },
    });
  }
});

// POST /api/quality/scan
router.post('/quality/scan', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = req.id || `qscan_${Date.now()}`;
  const repoId = req.body?.repositoryId || 'repo_demo_01';

  try {
    logger.info('continuous_maintenance_scan_started', requestId, { repositoryId: repoId });
    const result = await ContinuousQualityService.triggerContinuousMaintenanceCycle(repoId);
    const duration = Date.now() - startTime;

    metrics.recordApiRequest(duration, true);
    logger.info('continuous_maintenance_scan_completed', requestId, {
      durationMs: duration,
      healthScore: result.healthScore,
      alertsCount: result.newAlerts.length,
    });

    return res.json({
      success: true,
      result,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    metrics.recordApiRequest(duration, false);
    metrics.recordError(requestId, 'MAINTENANCE_SCAN_FAILED', 'QualityService', err.message);
    logger.error('continuous_maintenance_scan_failed', requestId, 'SCAN_ERROR', err.message, 'QualityService');

    return res.status(500).json({
      success: false,
      error: { code: 'SCAN_FAILED', message: err.message },
    });
  }
});

// GET /api/quality/alerts
router.get('/quality/alerts', (req: Request, res: Response) => {
  const repoId = (req.query.repositoryId as string) || 'repo_demo_01';
  try {
    const qualityMetrics = ContinuousQualityService.getQualityMetrics(repoId);
    return res.json({
      success: true,
      alerts: qualityMetrics.alerts,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'ALERTS_FETCH_ERROR', message: err.message },
    });
  }
});

// POST /api/quality/alerts/:id/resolve
router.post('/quality/alerts/:id/resolve', (req: Request, res: Response) => {
  const alertId = req.params.id;
  ContinuousQualityService.resolveAlert(alertId);
  return res.json({
    success: true,
    alertId,
    resolved: true,
  });
});

export default router;
