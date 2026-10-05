import { RiskLevel, ConfidenceLevel } from '../../types/predictionTypes';
import { db } from '../../../server/database/db';

export class DependencyRiskAgent {
  public static evaluate(repoId?: string): {
    totalDependencies: number;
    outdatedCount: number;
    vulnerableCount: number;
    riskLevel: RiskLevel;
    confidence: ConfidenceLevel;
    evidence: string[];
    recommendations: string[];
  } {
    const deps = db.getDependencyHistory(repoId);

    const outdated = deps.filter((d) => d.isOutdated);
    const vulnerable = deps.filter((d) => d.vulnerabilityCount > 0);

    const evidence: string[] = [];
    for (const v of vulnerable) {
      evidence.push(`${v.packageName} has ${v.vulnerabilityCount} known vulnerability advisory(ies).`);
    }
    for (const o of outdated) {
      evidence.push(`${o.packageName} is outdated (${o.currentVersion} -> ${o.latestVersion}).`);
    }

    let riskLevel: RiskLevel = 'low';
    if (vulnerable.length > 0) riskLevel = 'high';
    else if (outdated.length >= 3) riskLevel = 'medium';

    return {
      totalDependencies: deps.length,
      outdatedCount: outdated.length,
      vulnerableCount: vulnerable.length,
      riskLevel,
      confidence: 'high',
      evidence,
      recommendations:
        outdated.length > 0 || vulnerable.length > 0
          ? [`Update ${outdated.length} outdated package(s) and address ${vulnerable.length} vulnerability finding(s).`]
          : ['All dependencies are aligned with latest security baseline.'],
    };
  }
}
