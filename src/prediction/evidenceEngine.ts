import { EvidenceItem } from '../types/predictionTypes';
import { ModuleSignals } from './signalAggregator';

export class EvidenceEngine {
  public static generateEvidence(signals: ModuleSignals): EvidenceItem[] {
    const evidenceList: EvidenceItem[] = [];
    const mod = signals.module;

    // 1. Test Failure Evidence
    if (signals.testFailures > 0) {
      evidenceList.push({
        id: `ev_test_${mod}_${Date.now()}`,
        category: 'test',
        area: mod,
        observation: `${signals.testFailures} recorded test failures in ${mod}.`,
        evidenceText: `Database records confirm ${signals.testFailures} failing test executions out of ${signals.testRuns} recorded runs during the past 30 days.`,
        interpretation: `The ${mod} module exhibits recurrent test regression signals, indicating potential instability in recently modified paths.`,
        uncertainty: 'Test suite may not cover 100% of internal edge cases; failure count reflects executed test runs only.',
        source: 'test_runs',
        timestamp: new Date().toISOString(),
        numericalEvidence: {
          measuredValue: signals.testFailures,
          sampleSize: signals.testRuns,
        },
      });
    }

    // 2. Recent Changes & Code Churn Evidence
    if (signals.recentChanges >= 3) {
      evidenceList.push({
        id: `ev_chg_${mod}_${Date.now()}`,
        category: 'change',
        area: mod,
        observation: `High change churn detected (${signals.recentChanges} modifications in 30 days).`,
        evidenceText: `Commit history logs show ${signals.recentChanges} separate modifications touching files within ${mod} across the past 30 days.`,
        interpretation: `Frequent code edits correlate with higher defect introduction rates when accompanied by test failures.`,
        uncertainty: 'Refactorings and formatting commits can inflate churn metrics without necessarily introducing defects.',
        source: 'git_commits',
        timestamp: new Date().toISOString(),
        numericalEvidence: {
          measuredValue: signals.recentChanges,
        },
      });
    }

    // 3. Maintenance Frequency Evidence
    if (signals.maintenanceEvents >= 2) {
      evidenceList.push({
        id: `ev_mnt_${mod}_${Date.now()}`,
        category: 'change',
        area: mod,
        observation: `Repeated maintenance events (${signals.maintenanceEvents} bug fixes/patches recorded).`,
        evidenceText: `Maintenance logs detail ${signals.maintenanceEvents} targeted bug fixes or emergency patches applied to ${mod} in the past month.`,
        interpretation: `Repeated fixes in the same module suggest underlying structural complexity or incomplete initial remediations.`,
        uncertainty: 'Maintenance events may represent distinct unrelated feature adjustments.',
        source: 'maintenance_log',
        timestamp: new Date().toISOString(),
        numericalEvidence: {
          measuredValue: signals.maintenanceEvents,
        },
      });
    }

    // 4. Security Findings Evidence
    if (signals.securityFindings > 0) {
      evidenceList.push({
        id: `ev_sec_${mod}_${Date.now()}`,
        category: 'security',
        area: mod,
        observation: `${signals.securityFindings} security advisory findings associated with ${mod}.`,
        evidenceText: `Static analysis and vulnerability scans flagged ${signals.securityFindings} items (e.g. signature timing attacks or CORS exposure).`,
        interpretation: `Security review is advisable to verify defense-in-depth and avoid potential exploits in production.`,
        uncertainty: 'Static analysis alerts require manual audit to confirm exploitability in runtime context.',
        source: 'security_scanner',
        timestamp: new Date().toISOString(),
        numericalEvidence: {
          measuredValue: signals.securityFindings,
        },
      });
    }

    // 5. Performance Drift Evidence
    if (signals.p95LatencyMs >= 600) {
      evidenceList.push({
        id: `ev_perf_${mod}_${Date.now()}`,
        category: 'performance',
        area: mod,
        observation: `Elevated P95 response latency (${signals.p95LatencyMs}ms).`,
        evidenceText: `Telemetry recorded response times exceeding standard 500ms SLO threshold (measured P95: ${signals.p95LatencyMs}ms).`,
        interpretation: `Upstream service calls, lock contention, or inefficient serialization may be degrading throughput.`,
        uncertainty: 'Transient external API latency can temporarily elevate P95 percentiles.',
        source: 'performance_metrics',
        timestamp: new Date().toISOString(),
        numericalEvidence: {
          measuredValue: signals.p95LatencyMs,
          threshold: 500,
        },
      });
    }

    return evidenceList;
  }
}
