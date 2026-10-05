import { RiskLevel, ConfidenceLevel } from '../../types/predictionTypes';
import { db } from '../../../server/database/db';

export class SecurityRiskAgent {
  public static evaluate(repoId?: string): {
    findingsCount: number;
    riskLevel: RiskLevel;
    confidence: ConfidenceLevel;
    evidence: string[];
    recommendations: string[];
  } {
    const findings = db.getSecurityHistory(repoId, 60);

    if (findings.length === 0) {
      return {
        findingsCount: 0,
        riskLevel: 'low',
        confidence: 'medium',
        evidence: ['No open security advisories or vulnerabilities currently recorded.'],
        recommendations: ['Maintain periodic static security analysis scans.'],
      };
    }

    const critical = findings.filter((f) => f.severity === 'critical');
    const high = findings.filter((f) => f.severity === 'high');
    const medium = findings.filter((f) => f.severity === 'medium');

    const evidence = findings.map(
      (f) => `[${f.severity.toUpperCase()}] ${f.title} (${f.module})`
    );

    let riskLevel: RiskLevel = 'low';
    if (critical.length > 0 || high.length > 0) {
      riskLevel = 'high';
    } else if (medium.length > 0) {
      riskLevel = 'medium';
    }

    return {
      findingsCount: findings.length,
      riskLevel,
      confidence: 'high',
      evidence,
      recommendations: [
        `Review and remediate ${findings.length} security finding(s) with focus on timing comparisons and permissive CORS configurations.`,
      ],
    };
  }
}
