import { MCPToolDefinition } from '../types';
import { db } from '../../server/database/db';

export const getBuildHistoryDefinition: MCPToolDefinition = {
  name: 'get_build_history',
  description: 'Retrieves CI/CD build run outcomes, durations, and step failures.',
  inputSchema: {
    type: 'object',
    properties: {
      repositoryId: {
        type: 'string',
        description: 'Optional target repository ID.',
      },
      days: {
        type: 'number',
        description: 'Lookback window in days (default: 30).',
      },
    },
    required: [],
  },
};

export async function executeGetBuildHistory(args: { repositoryId?: string; days?: number }) {
  const days = Math.min(Math.max(args.days || 30, 1), 365);
  const records = db.getBuildHistory(args.repositoryId, days);
  const failures = records.filter((b) => b.status === 'failure');

  return {
    totalBuilds: records.length,
    failureCount: failures.length,
    buildSuccessRate: records.length > 0 ? Number(((records.length - failures.length) / records.length).toFixed(3)) : 1,
    records,
  };
}
