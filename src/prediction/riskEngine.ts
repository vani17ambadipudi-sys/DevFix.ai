import { RiskLevel, ConfidenceLevel } from '../types/predictionTypes';
import { ModuleSignals } from './signalAggregator';

export interface EvaluatedRisk {
  riskLevel: RiskLevel;
  confidence: ConfidenceLevel;
  score: number; // 0 - 100
  primaryDrivers: string[];
  reason: string;
  interpretation: string;
}

export class RiskEngine {
  public static evaluate(signals: ModuleSignals): EvaluatedRisk {
    const drivers: string[] = [];
    let score = 0;

    // Guard: If zero evidence recorded anywhere for this module, return Unknown
    if (
      signals.testRuns === 0 &&
      signals.recentChanges === 0 &&
      signals.maintenanceEvents === 0 &&
      signals.securityFindings === 0
    ) {
      return {
        riskLevel: 'unknown',
        confidence: 'low',
        score: 0,
        primaryDrivers: [],
        reason: 'Insufficient historical data recorded for this module.',
        interpretation: 'No test executions, commit logs, or maintenance events are currently available.',
      };
    }

    // 1. Test Failure Contribution
    if (signals.testFailures >= 7) {
      score += 45;
      drivers.push(`${signals.testFailures} recorded test failures`);
    } else if (signals.testFailures >= 4) {
      score += 30;
      drivers.push(`${signals.testFailures} test failures`);
    } else if (signals.testFailures >= 1) {
      score += 15;
      drivers.push(`${signals.testFailures} test failure(s)`);
    }

    // 2. Recent Changes & Code Churn
    if (signals.recentChanges >= 5) {
      score += 25;
      drivers.push(`${signals.recentChanges} recent code modifications`);
    } else if (signals.recentChanges >= 3) {
      score += 15;
      drivers.push(`${signals.recentChanges} recent code edits`);
    }

    // 3. Maintenance Frequency
    if (signals.maintenanceEvents >= 3) {
      score += 20;
      drivers.push(`${signals.maintenanceEvents} repeated maintenance events`);
    } else if (signals.maintenanceEvents >= 1) {
      score += 10;
      drivers.push(`${signals.maintenanceEvents} maintenance event(s)`);
    }

    // 4. Security Findings
    if (signals.securityFindings >= 2) {
      score += 25;
      drivers.push(`${signals.securityFindings} security advisory findings`);
    } else if (signals.securityFindings >= 1) {
      score += 15;
      drivers.push(`1 security advisory finding`);
    }

    // 5. Performance Latency
    if (signals.p95LatencyMs >= 700) {
      score += 15;
      drivers.push(`P95 latency elevated to ${signals.p95LatencyMs}ms`);
    }

    // Determine Risk Level from explainable score thresholds
    let riskLevel: RiskLevel = 'low';
    if (score >= 75) {
      riskLevel = 'high';
    } else if (score >= 35) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }

    // Determine Confidence Level based on sample size and signal corroboration
    let confidence: ConfidenceLevel = 'low';
    const totalSignalsCount =
      (signals.testRuns > 0 ? 1 : 0) +
      (signals.recentChanges > 0 ? 1 : 0) +
      (signals.maintenanceEvents > 0 ? 1 : 0) +
      (signals.securityFindings > 0 ? 1 : 0);

    if (signals.testRuns >= 5 && totalSignalsCount >= 2) {
      confidence = 'high';
    } else if (signals.testRuns >= 2 || totalSignalsCount >= 2) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }

    const reason =
      drivers.length > 0
        ? `Identified based on: ${drivers.join(', ')}.`
        : 'Metrics are within nominal stability thresholds.';

    let interpretation = '';
    if (riskLevel === 'high') {
      interpretation = `The ${signals.module} area has accumulated multiple maintenance and stability signals. Proactive review and regression expansion are strongly recommended.`;
    } else if (riskLevel === 'medium') {
      interpretation = `The ${signals.module} area exhibits moderate maintenance signals. Targeted testing and review of recent changes are advised.`;
    } else {
      interpretation = `The ${signals.module} area appears stable based on available recorded evidence.`;
    }

    return {
      riskLevel,
      confidence,
      score: Math.min(score, 100),
      primaryDrivers: drivers,
      reason,
      interpretation,
    };
  }
}
