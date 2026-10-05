import { Router, Request, Response } from 'express';
import { db } from '../database/db';
import { PredictionService } from '../../src/prediction/predictionService';
import { TrendEngine } from '../../src/prediction/trendEngine';
import { logger } from '../observability/logger';
import { metrics } from '../observability/metrics';

const router = Router();

// POST /api/predictions/run
router.post('/predictions/run', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const requestId = req.id || `pred_run_${Date.now()}`;
  try {
    const { repositoryId } = req.body || {};
    logger.info('predictive_analysis_run', requestId, { repositoryId });

    const report = await PredictionService.runPredictiveAnalysis(repositoryId);
    const duration = Date.now() - startTime;

    metrics.recordApiRequest(duration, true);
    logger.info('predictive_analysis_completed', requestId, {
      durationMs: duration,
      riskAreasFound: report.riskAreas.length,
      recommendationsCount: report.recommendations.length,
    });

    return res.json({
      success: true,
      report,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    metrics.recordApiRequest(duration, false);
    metrics.recordError(requestId, 'PREDICTION_ERROR', 'PredictionEngine', err.message);
    logger.error('predictive_analysis_failed', requestId, 'PREDICTION_ERROR', err.message, 'PredictionEngine');

    return res.status(500).json({
      success: false,
      error: {
        code: 'PREDICTION_FAILED',
        message: err.message,
      },
    });
  }
});

// GET /api/predictions
router.get('/predictions', (req: Request, res: Response) => {
  const { repositoryId } = req.query;
  const runs = db.getPredictionRuns(repositoryId as string | undefined);
  res.json({
    success: true,
    total: runs.length,
    runs,
  });
});

// GET /api/predictions/:id
router.get('/predictions/:id', (req: Request, res: Response) => {
  const run = db.getPredictionRunById(req.params.id);
  if (!run) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Prediction run ${req.params.id} not found.` },
    });
  }
  return res.json({ success: true, run });
});

// GET /api/predictions/:id/risks
router.get('/predictions/:id/risks', (req: Request, res: Response) => {
  const run = db.getPredictionRunById(req.params.id);
  if (!run || !run.report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }
  return res.json({
    success: true,
    riskAreas: run.report.riskAreas,
  });
});

// GET /api/predictions/:id/evidence
router.get('/predictions/:id/evidence', (req: Request, res: Response) => {
  const run = db.getPredictionRunById(req.params.id);
  if (!run || !run.report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }
  const allEvidence = run.report.riskAreas.flatMap((r) => r.evidence);
  return res.json({
    success: true,
    total: allEvidence.length,
    evidence: allEvidence,
  });
});

// GET /api/predictions/:id/recommendations
router.get('/predictions/:id/recommendations', (req: Request, res: Response) => {
  const run = db.getPredictionRunById(req.params.id);
  if (!run || !run.report) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }
  return res.json({
    success: true,
    recommendations: run.report.recommendations,
  });
});

// POST /api/predictions/recommendations/:id/status
router.post('/predictions/recommendations/:id/status', (req: Request, res: Response) => {
  const { status } = req.body || {};
  if (!['proposed', 'accepted', 'investigating', 'dismissed'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid recommendation status' });
  }

  const updated = db.updateRecommendationStatus(req.params.id, status);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Recommendation not found' });
  }

  return res.json({
    success: true,
    id: req.params.id,
    status,
  });
});

// GET /api/repositories/:id/hotspots and /api/repository/:id/hotspots
const getHotspotsHandler = (req: Request, res: Response) => {
  const hotspots = db.getChangeHotspots(req.params.id);
  res.json({
    success: true,
    repositoryId: req.params.id,
    hotspots,
  });
};
router.get('/repositories/:id/hotspots', getHotspotsHandler);
router.get('/repository/:id/hotspots', getHotspotsHandler);

// GET /api/repositories/:id/trends and /api/repository/:id/trends
const getTrendsHandler = (req: Request, res: Response) => {
  const trends = TrendEngine.analyze(req.params.id);
  res.json({
    success: true,
    repositoryId: req.params.id,
    trends,
  });
};
router.get('/repositories/:id/trends', getTrendsHandler);
router.get('/repository/:id/trends', getTrendsHandler);

export default router;
