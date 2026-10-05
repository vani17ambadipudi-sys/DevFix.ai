import { MCPToolDefinition } from '../types';
import { db } from '../../server/database/db';

export const getPerformanceHistoryDefinition: MCPToolDefinition = {
  name: 'get_performance_history',
  description: 'Retrieves API and test execution duration measurements and P95 latency trends.',
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

export async function executeGetPerformanceHistory(args: { repositoryId?: string; days?: number }) {
  const days = Math.min(Math.max(args.days || 30, 1), 365);
  const records = db.getPerformanceHistory(args.repositoryId, days);

  return {
    totalMeasurements: records.length,
    records,
  };
}
