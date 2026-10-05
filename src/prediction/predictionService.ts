import { PredictionReport, RiskArea, PredictionRunRecord } from '../types/predictionTypes';
import { SignalAggregator } from './signalAggregator';
import { TrendEngine } from './trendEngine';
import { RiskEngine } from './riskEngine';
import { EvidenceEngine } from './evidenceEngine';
import { PreventiveRecommendationService } from '../recommendations/preventiveRecommendation';
import { db } from '../../server/database/db';
import crypto from 'crypto';

export class PredictionService {
  public static async runPredictiveAnalysis(repoId?: string): Promise<PredictionReport> {
    const startTime = Date.now();
    const runId = `pred_${crypto.randomUUID().slice(0, 8)}`;
    const repositoryId = repoId || 'repo_demo_01';

    const repo = db.getRepositoryById(repositoryId);
    const repoName = repo ? repo.name : 'DevFix Demo Platform (auth & payments)';

    // 1. Aggregate signals across modules
    const moduleSignalsMap = SignalAggregator.aggregate(repositoryId, 30);
    const hotspots = db.getChangeHotspots(repositoryId);

    // 2. Analyze historical trends
    const trendResult = TrendEngine.analyze(repositoryId);

    const riskAreas: RiskArea[] = [];
    const allRecommendations: any[] = [];
    let totalSignalsCount = 0;

    for (const [mod, signals] of moduleSignalsMap.entries()) {
      totalSignalsCount += signals.signals.length;

      const evaluatedRisk = RiskEngine.evaluate(signals);
      const evidence = EvidenceEngine.generateEvidence(signals);
      const recommendations = PreventiveRecommendationService.generateRecommendations(signals, evaluatedRisk);

      allRecommendations.push(...recommendations);

      riskAreas.push({
        area: mod,
        riskLevel: evaluatedRisk.riskLevel,
        confidence: evaluatedRisk.confidence,
        primaryDrivers: evaluatedRisk.primaryDrivers,
        signals: signals.signals,
        evidence,
        reason: evaluatedRisk.reason,
        interpretation: evaluatedRisk.interpretation,
        recommendations,
      });
    }

    // Sort risk areas by priority: high first, then medium, then low, then unknown
    const priorityWeight = { high: 4, medium: 3, low: 2, unknown: 1 };
    riskAreas.sort((a, b) => priorityWeight[b.riskLevel] - priorityWeight[a.riskLevel]);

    const durationMs = Date.now() - startTime;

    const report: PredictionReport = {
      id: runId,
      repositoryId,
      repositoryName: repoName,
      generatedAt: new Date().toISOString(),
      durationMs,
      totalSignalsAnalyzed: totalSignalsCount,
      riskAreas,
      hotspots,
      timeline: trendResult.timeline,
      recommendations: allRecommendations,
      summary: {
        highRiskCount: riskAreas.filter((r) => r.riskLevel === 'high').length,
        mediumRiskCount: riskAreas.filter((r) => r.riskLevel === 'medium').length,
        lowRiskCount: riskAreas.filter((r) => r.riskLevel === 'low').length,
        unknownRiskCount: riskAreas.filter((r) => r.riskLevel === 'unknown').length,
        totalHotspots: hotspots.length,
        recommendedActionsCount: allRecommendations.length,
      },
    };

    // Save prediction run into database
    const runRecord: PredictionRunRecord = {
      id: runId,
      repositoryId,
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      status: 'completed',
      report,
    };
    db.savePredictionRun(runRecord);

    return report;
  }
}
