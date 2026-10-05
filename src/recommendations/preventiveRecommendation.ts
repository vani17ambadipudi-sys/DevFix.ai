import { PreventiveRecommendation } from '../types/predictionTypes';
import { ModuleSignals } from '../prediction/signalAggregator';
import { EvaluatedRisk } from '../prediction/riskEngine';

export class PreventiveRecommendationService {
  public static generateRecommendations(
    signals: ModuleSignals,
    risk: EvaluatedRisk
  ): PreventiveRecommendation[] {
    const list: PreventiveRecommendation[] = [];
    const mod = signals.module;
    const now = new Date().toISOString();

    // 1. Recommendation for Test Failures
    if (signals.testFailures >= 4) {
      list.push({
        id: `rec_${mod.replace(/\//g, '_')}_test_${Date.now()}`,
        area: mod,
        title: `Expand Regression Suite for ${mod}`,
        action: `Add parameterized unit tests and boundary test cases targeting recent failure points in ${mod}.`,
        priority: risk.riskLevel === 'high' ? 'high' : 'medium',
        category: 'regression_testing',
        status: 'proposed',
        evidenceSummary: `${signals.testFailures} recorded test failures across the past 30 days.`,
        suggestedPatchPlan: `Create dedicated mock fixtures for external dependencies and assert expected error handling for edge cases.`,
        createdAt: now,
      });
    }

    // 2. Recommendation for High Code Churn / Repeated Maintenance
    if (signals.recentChanges >= 4 && signals.maintenanceEvents >= 2) {
      list.push({
        id: `rec_${mod.replace(/\//g, '_')}_refactor_${Date.now()}`,
        area: mod,
        title: `Modularize & Refactor Critical Paths in ${mod}`,
        action: `Review cyclomatic complexity and decouple heavily modified entry points in ${mod} into smaller pure functions.`,
        priority: 'medium',
        category: 'refactor_complexity',
        status: 'proposed',
        evidenceSummary: `${signals.recentChanges} recent commits and ${signals.maintenanceEvents} patch events in the same module.`,
        suggestedPatchPlan: `Split monolithic service handlers into modular strategy patterns with isolated unit test suites.`,
        createdAt: now,
      });
    }

    // 3. Recommendation for Security Findings
    if (signals.securityFindings > 0) {
      list.push({
        id: `rec_${mod.replace(/\//g, '_')}_sec_${Date.now()}`,
        area: mod,
        title: `Perform Targeted Security Audit on ${mod}`,
        action: `Verify constant-time comparisons, input validation sanitizers, and CORS headers in ${mod}.`,
        priority: 'high',
        category: 'security_review',
        status: 'proposed',
        evidenceSummary: `${signals.securityFindings} security advisory warning(s) flagged during static scanning.`,
        suggestedPatchPlan: `Apply timingSafeEqual for signature verification and restrict allowed origins on webhook endpoints.`,
        createdAt: now,
      });
    }

    // 4. Recommendation for Latency Drift
    if (signals.p95LatencyMs >= 600) {
      list.push({
        id: `rec_${mod.replace(/\//g, '_')}_perf_${Date.now()}`,
        area: mod,
        title: `Profile Upstream Connection Latency in ${mod}`,
        action: `Implement connection pooling, timeout budgets, and circuit breaker fallback in ${mod}.`,
        priority: 'medium',
        category: 'performance_audit',
        status: 'proposed',
        evidenceSummary: `Measured P95 response latency exceeded 600ms (observed ${signals.p95LatencyMs}ms).`,
        suggestedPatchPlan: `Configure max connection reuse and enable HTTP client keep-alive.`,
        createdAt: now,
      });
    }

    return list;
  }
}
