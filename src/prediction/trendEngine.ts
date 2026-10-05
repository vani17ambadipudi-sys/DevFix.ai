import { TrendTimelinePoint } from '../types/predictionTypes';
import { db } from '../../server/database/db';

export interface TrendAnalysisResult {
  timeline: TrendTimelinePoint[];
  direction: 'increasing' | 'stable' | 'decreasing' | 'insufficient_data';
  observation: string;
}

export class TrendEngine {
  public static analyze(repoId?: string): TrendAnalysisResult {
    const tests = db.getTestHistory(repoId, 28);
    const builds = db.getBuildHistory(repoId, 28);
    const security = db.getSecurityHistory(repoId, 28);
    const dependencies = db.getDependencyHistory(repoId);
    const maintenance = db.getMaintenanceHistory(repoId, 28);
    const performance = db.getPerformanceHistory(repoId, 28);

    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;

    const timeline: TrendTimelinePoint[] = [];

    // Construct 4 consecutive weeks (Week 1 is 4 weeks ago, Week 4 is current week)
    for (let w = 3; w >= 0; w--) {
      const start = now - (w + 1) * weekMs;
      const end = now - w * weekMs;
      const weekLabel = `Week ${4 - w}`;
      const dateLabel = new Date(start).toLocaleDateString([], { month: 'short', day: 'numeric' });

      const weekTests = tests.filter((t) => {
        const time = new Date(t.timestamp).getTime();
        return time >= start && time < end;
      });
      const weekBuilds = builds.filter((b) => {
        const time = new Date(b.timestamp).getTime();
        return time >= start && time < end;
      });
      const weekSec = security.filter((s) => {
        const time = new Date(s.timestamp).getTime();
        return time >= start && time < end;
      });
      const weekMaint = maintenance.filter((m) => {
        const time = new Date(m.timestamp).getTime();
        return time >= start && time < end;
      });
      const weekPerf = performance.filter((p) => {
        const time = new Date(p.timestamp).getTime();
        return time >= start && time < end;
      });

      const maxP95 = weekPerf.length > 0 ? Math.max(...weekPerf.map((p) => p.p95DurationMs)) : 0;

      timeline.push({
        period: weekLabel,
        dateLabel,
        testFailures: weekTests.filter((t) => !t.passed).length,
        buildFailures: weekBuilds.filter((b) => b.status === 'failure').length,
        securityFindings: weekSec.length,
        dependencyFindings: dependencies.filter((d) => d.isOutdated).length,
        maintenanceEvents: weekMaint.length,
        p95LatencyMs: maxP95,
      });
    }

    // Determine direction
    if (timeline.length < 2) {
      return {
        timeline,
        direction: 'insufficient_data',
        observation: 'Insufficient historical data to establish reliable trends.',
      };
    }

    const firstHalfFailures = (timeline[0]?.testFailures || 0) + (timeline[1]?.testFailures || 0);
    const secondHalfFailures = (timeline[2]?.testFailures || 0) + (timeline[3]?.testFailures || 0);

    let direction: TrendAnalysisResult['direction'] = 'stable';
    let observation = 'Recorded failure rates remain steady over the observed window.';

    if (secondHalfFailures > firstHalfFailures + 2) {
      direction = 'increasing';
      observation = `Observed upward trend in recorded test failures (${firstHalfFailures} in earlier weeks vs ${secondHalfFailures} in recent weeks).`;
    } else if (firstHalfFailures > secondHalfFailures + 2) {
      direction = 'decreasing';
      observation = `Observed downward trend in test failures indicating stabilization.`;
    }

    return {
      timeline,
      direction,
      observation,
    };
  }
}
