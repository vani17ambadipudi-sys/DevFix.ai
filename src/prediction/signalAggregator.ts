import { RiskSignal } from '../types/predictionTypes';
import { db } from '../../server/database/db';

export interface ModuleSignals {
  module: string;
  testFailures: number;
  testRuns: number;
  recentChanges: number;
  maintenanceEvents: number;
  securityFindings: number;
  outdatedDependencies: number;
  p95LatencyMs: number;
  signals: RiskSignal[];
}

export class SignalAggregator {
  public static aggregate(repoId?: string, lookbackDays: number = 30): Map<string, ModuleSignals> {
    const tests = db.getTestHistory(repoId, lookbackDays);
    const builds = db.getBuildHistory(repoId, lookbackDays);
    const security = db.getSecurityHistory(repoId, lookbackDays);
    const dependencies = db.getDependencyHistory(repoId);
    const maintenance = db.getMaintenanceHistory(repoId, lookbackDays);
    const hotspots = db.getChangeHotspots(repoId);
    const performance = db.getPerformanceHistory(repoId, lookbackDays);

    const moduleMap = new Map<string, ModuleSignals>();

    const getOrCreate = (mod: string): ModuleSignals => {
      if (!moduleMap.has(mod)) {
        moduleMap.set(mod, {
          module: mod,
          testFailures: 0,
          testRuns: 0,
          recentChanges: 0,
          maintenanceEvents: 0,
          securityFindings: 0,
          outdatedDependencies: 0,
          p95LatencyMs: 0,
          signals: [],
        });
      }
      return moduleMap.get(mod)!;
    };

    // 1. Process Hotspots (recent code changes & complexity)
    for (const h of hotspots) {
      const entry = getOrCreate(h.path);
      entry.recentChanges = h.changesCount;
      entry.signals.push({
        id: `sig_chg_${h.path}`,
        category: 'recent_changes',
        signalName: 'Recent Code Churn',
        value: h.changesCount,
        unit: 'modifications',
        period: `${lookbackDays}_days`,
        source: 'git_commits',
        timestamp: h.lastModifiedAt,
      });

      entry.signals.push({
        id: `sig_cpx_${h.path}`,
        category: 'code_complexity',
        signalName: 'Cyclomatic Complexity',
        value: h.complexityScore,
        unit: 'score',
        period: 'current',
        source: 'static_analysis',
        timestamp: h.lastModifiedAt,
      });
    }

    // 2. Process Tests
    for (const t of tests) {
      const entry = getOrCreate(t.module);
      entry.testRuns++;
      if (!t.passed) {
        entry.testFailures++;
      }
    }

    for (const [mod, entry] of moduleMap.entries()) {
      if (entry.testRuns > 0) {
        entry.signals.push({
          id: `sig_tst_${mod}`,
          category: 'test_failures',
          signalName: 'Test Failure Frequency',
          value: entry.testFailures,
          unit: 'failures',
          period: `${lookbackDays}_days`,
          source: 'test_runs',
          timestamp: new Date().toISOString(),
          metadata: { totalRuns: entry.testRuns },
        });
      }
    }

    // 3. Process Maintenance Events
    for (const m of maintenance) {
      const entry = getOrCreate(m.area);
      entry.maintenanceEvents++;
    }

    for (const [mod, entry] of moduleMap.entries()) {
      if (entry.maintenanceEvents > 0) {
        entry.signals.push({
          id: `sig_mnt_${mod}`,
          category: 'maintenance_frequency',
          signalName: 'Maintenance Event Frequency',
          value: entry.maintenanceEvents,
          unit: 'events',
          period: `${lookbackDays}_days`,
          source: 'maintenance_log',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 4. Process Security Findings
    for (const s of security) {
      const mod = s.module.startsWith('src/') ? s.module.split('/').slice(0, 2).join('/') : s.module;
      const entry = getOrCreate(mod);
      entry.securityFindings++;
      entry.signals.push({
        id: `sig_sec_${s.id}`,
        category: 'security_findings',
        signalName: `Security: ${s.title}`,
        value: s.severity === 'critical' ? 4 : s.severity === 'high' ? 3 : s.severity === 'medium' ? 2 : 1,
        unit: 'severity_rank',
        period: `${lookbackDays}_days`,
        source: 'security_scanner',
        timestamp: s.timestamp,
        metadata: { cve: s.cveOrIdentifier, title: s.title },
      });
    }

    // 5. Process Performance Latency Measurements
    for (const p of performance) {
      const mod = p.endpoint.includes('payments') ? 'src/payments' : p.endpoint.includes('auth') ? 'src/auth' : 'src/general';
      const entry = getOrCreate(mod);
      if (p.p95DurationMs > entry.p95LatencyMs) {
        entry.p95LatencyMs = p.p95DurationMs;
      }
    }

    for (const [mod, entry] of moduleMap.entries()) {
      if (entry.p95LatencyMs > 0) {
        entry.signals.push({
          id: `sig_perf_${mod}`,
          category: 'performance_regression',
          signalName: 'P95 Response Latency',
          value: entry.p95LatencyMs,
          unit: 'ms',
          period: `${lookbackDays}_days`,
          source: 'performance_metrics',
          timestamp: new Date().toISOString(),
        });
      }
    }

    return moduleMap;
  }
}
