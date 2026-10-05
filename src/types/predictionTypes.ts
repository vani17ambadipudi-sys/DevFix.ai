// DevFix AI — Phase 10: Predictive Software Engineering Types
// Strict evidence-based models distinguishing Fact, Measurement, Pattern, and Recommendation.

export type RiskLevel = 'low' | 'medium' | 'high' | 'unknown';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type RecommendationPriority = 'low' | 'medium' | 'high';

export type RecommendationStatus = 'proposed' | 'accepted' | 'investigating' | 'dismissed';

export type SignalCategory =
  | 'test_failures'
  | 'build_failures'
  | 'recent_changes'
  | 'security_findings'
  | 'dependency_findings'
  | 'performance_regression'
  | 'maintenance_frequency'
  | 'code_complexity';

export interface RiskSignal {
  id: string;
  category: SignalCategory;
  signalName: string;
  value: number;
  unit: string;
  period: string; // e.g. "30_days", "14_days"
  source: string; // e.g. "test_runs", "git_log", "npm_audit", "build_telemetry"
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface EvidenceItem {
  id: string;
  category: 'test' | 'build' | 'security' | 'dependency' | 'change' | 'performance';
  area: string;
  observation: string;
  evidenceText: string;
  interpretation: string;
  uncertainty: string;
  source: string;
  timestamp: string;
  numericalEvidence?: {
    measuredValue: number;
    threshold?: number;
    sampleSize?: number;
  };
}

export interface PreventiveRecommendation {
  id: string;
  area: string;
  title: string;
  action: string;
  priority: RecommendationPriority;
  category:
    | 'regression_testing'
    | 'dependency_update'
    | 'refactor_complexity'
    | 'security_review'
    | 'error_handling'
    | 'performance_audit';
  status: RecommendationStatus;
  evidenceSummary: string;
  suggestedPatchPlan?: string;
  createdAt: string;
}

export interface RiskArea {
  area: string; // e.g. "src/payments", "src/auth"
  riskLevel: RiskLevel;
  confidence: ConfidenceLevel;
  primaryDrivers: string[];
  signals: RiskSignal[];
  evidence: EvidenceItem[];
  reason: string;
  interpretation: string;
  recommendations: PreventiveRecommendation[];
}

export interface ChangeHotspot {
  path: string;
  changesCount: number;
  failureCount: number;
  maintenanceCount: number;
  riskScore: number;
  lastModifiedAt: string;
  complexityScore: number;
}

export interface TrendTimelinePoint {
  period: string; // e.g. "Week 1", "Week 2", "Week 3", "Week 4"
  dateLabel: string;
  testFailures: number;
  buildFailures: number;
  securityFindings: number;
  dependencyFindings: number;
  maintenanceEvents: number;
  p95LatencyMs: number;
}

export interface PredictionReport {
  id: string;
  repositoryId: string;
  repositoryName: string;
  generatedAt: string;
  durationMs: number;
  totalSignalsAnalyzed: number;
  riskAreas: RiskArea[];
  hotspots: ChangeHotspot[];
  timeline: TrendTimelinePoint[];
  recommendations: PreventiveRecommendation[];
  summary: {
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    unknownRiskCount: number;
    totalHotspots: number;
    recommendedActionsCount: number;
  };
}

export interface PredictionRunRecord {
  id: string;
  repositoryId: string;
  startedAt: string;
  completedAt: string;
  status: 'running' | 'completed' | 'failed';
  report?: PredictionReport;
  error?: string;
}

export interface TestHistoryRecord {
  id: string;
  repositoryId: string;
  module: string;
  testName: string;
  passed: boolean;
  durationMs: number;
  timestamp: string;
  errorMessage?: string;
}

export interface BuildHistoryRecord {
  id: string;
  repositoryId: string;
  status: 'success' | 'failure';
  durationMs: number;
  timestamp: string;
  errorStep?: string;
}

export interface SecurityHistoryRecord {
  id: string;
  repositoryId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  module: string;
  cveOrIdentifier?: string;
  timestamp: string;
}

export interface DependencyHistoryRecord {
  id: string;
  repositoryId: string;
  packageName: string;
  currentVersion: string;
  latestVersion: string;
  isOutdated: boolean;
  vulnerabilityCount: number;
  timestamp: string;
}

export interface MaintenanceHistoryRecord {
  id: string;
  repositoryId: string;
  area: string;
  type: 'bug_fix' | 'patch' | 'refactor' | 'dependency_bump';
  description: string;
  timestamp: string;
}

export interface PerformanceHistoryRecord {
  id: string;
  repositoryId: string;
  endpoint: string;
  p95DurationMs: number;
  avgDurationMs: number;
  timestamp: string;
}
