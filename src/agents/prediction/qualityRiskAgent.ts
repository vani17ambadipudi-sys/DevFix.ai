import { RiskArea, RiskLevel, ConfidenceLevel } from '../../types/predictionTypes';
import { ModuleSignals } from '../../prediction/signalAggregator';

export class QualityRiskAgent {
  public static evaluate(signals: ModuleSignals): {
    area: string;
    signals: string[];
    riskLevel: RiskLevel;
    confidence: ConfidenceLevel;
    evidence: string[];
    recommendation: string;
  } {
    const evidence: string[] = [];
    const signalNames: string[] = [];

    if (signals.testFailures > 0) {
      evidence.push(`${signals.testFailures} recorded test failures`);
      signalNames.push('test_failure_frequency');
    }
    if (signals.recentChanges >= 3) {
      evidence.push(`${signals.recentChanges} recent code modifications`);
      signalNames.push('code_churn');
    }

    let riskLevel: RiskLevel = 'low';
    if (signals.testFailures >= 6) riskLevel = 'high';
    else if (signals.testFailures >= 3) riskLevel = 'medium';

    return {
      area: signals.module,
      signals: signalNames,
      riskLevel,
      confidence: signals.testRuns >= 5 ? 'high' : 'medium',
      evidence,
      recommendation:
        riskLevel !== 'low'
          ? `Expand automated regression test cases around recently modified functions in ${signals.module}.`
          : `Quality metrics within nominal parameters.`,
    };
  }
}
