// DevFix AI — Phase 9: Continuous Software Maintenance & Quality Types
// Provides continuous quality health monitoring, automated quality gates, and regression telemetry.

export type QualityGateStatus = 'passed' | 'warning' | 'failed';

export interface QualityGate {
  id: string;
  name: string;
  category: 'build' | 'test' | 'security' | 'dependency' | 'flaky_tests';
  status: QualityGateStatus;
  score: number; // 0 - 100
  metricLabel: string;
  description: string;
  threshold: string;
}

export interface QualityAlert {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'regression' | 'flaky_test' | 'security_drift' | 'dependency_outdated' | 'build_break';
  affectedModule: string;
  description: string;
  suggestedAction: string;
  timestamp: string;
  resolved: boolean;
}

export interface ContinuousQualityMetrics {
  repositoryId: string;
  healthScore: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  lastContinuousRunAt: string;
  monitoringStatus: 'active' | 'evaluating' | 'idle';
  testStabilityIndex: number; // 0 - 100
  buildSuccessRate: number; // 0 - 100
  codeQualityIndex: number; // 0 - 100
  flakyTestCount: number;
  openSecurityAlerts: number;
  dependencyFreshnessScore: number; // 0 - 100
  gates: QualityGate[];
  alerts: QualityAlert[];
  recentTelemetryCount: {
    tests: number;
    builds: number;
    securityScans: number;
    maintenanceRuns: number;
  };
}

export interface QualityScanResult {
  scanId: string;
  timestamp: string;
  durationMs: number;
  healthScore: number;
  regressionsDetected: number;
  flakyTestsIdentified: number;
  newAlerts: QualityAlert[];
  metrics: ContinuousQualityMetrics;
}
