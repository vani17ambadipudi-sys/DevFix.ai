import { PredictionReport, RiskArea } from '../../types/predictionTypes';
import { PredictionService } from '../../prediction/predictionService';

export class PredictionManagerAgent {
  public static async execute(repositoryId?: string): Promise<{
    success: boolean;
    report: PredictionReport;
    managerSummary: string;
  }> {
    const report = await PredictionService.runPredictiveAnalysis(repositoryId);

    const highRisks = report.riskAreas.filter((r) => r.riskLevel === 'high');
    const mediumRisks = report.riskAreas.filter((r) => r.riskLevel === 'medium');

    const summaryParts: string[] = [
      `Prediction Manager synthesized ${report.totalSignalsAnalyzed} measured telemetry signals across ${report.riskAreas.length} repository modules.`,
    ];

    if (highRisks.length > 0) {
      summaryParts.push(
        `Identified ${highRisks.length} high-risk area(s): ${highRisks.map((h) => h.area).join(', ')}.`
      );
    }

    if (mediumRisks.length > 0) {
      summaryParts.push(
        `Identified ${mediumRisks.length} medium-risk area(s): ${mediumRisks.map((m) => m.area).join(', ')}.`
      );
    }

    summaryParts.push(
      `Generated ${report.recommendations.length} preventive maintenance recommendations awaiting developer review.`
    );

    return {
      success: true,
      report,
      managerSummary: summaryParts.join(' '),
    };
  }
}
