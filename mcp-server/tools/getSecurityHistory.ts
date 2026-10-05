import { MCPToolDefinition } from '../types';
import { db } from '../../server/database/db';

export const getSecurityHistoryDefinition: MCPToolDefinition = {
  name: 'get_security_history',
  description: 'Retrieves security findings, static analysis alerts, and CVE advisory history without exposing secrets.',
  inputSchema: {
    type: 'object',
    properties: {
      repositoryId: {
        type: 'string',
        description: 'Optional target repository ID.',
      },
      days: {
        type: 'number',
        description: 'Lookback window in days (default: 60).',
      },
    },
    required: [],
  },
};

export async function executeGetSecurityHistory(args: { repositoryId?: string; days?: number }) {
  const days = Math.min(Math.max(args.days || 60, 1), 365);
  const records = db.getSecurityHistory(args.repositoryId, days);

  return {
    totalFindings: records.length,
    criticalCount: records.filter((s) => s.severity === 'critical').length,
    highCount: records.filter((s) => s.severity === 'high').length,
    mediumCount: records.filter((s) => s.severity === 'medium').length,
    lowCount: records.filter((s) => s.severity === 'low').length,
    records,
  };
}
