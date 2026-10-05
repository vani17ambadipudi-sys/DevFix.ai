import { MCPToolDefinition } from '../types';
import { db } from '../../server/database/db';

export const getTestHistoryDefinition: MCPToolDefinition = {
  name: 'get_test_history',
  description: 'Retrieves authentic recorded test execution outcomes, failure rates, and module-level test errors over time.',
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
      module: {
        type: 'string',
        description: 'Optional filter by module path (e.g. "src/payments", "src/auth").',
      },
    },
    required: [],
  },
};

export async function executeGetTestHistory(args: { repositoryId?: string; days?: number; module?: string }) {
  const days = Math.min(Math.max(args.days || 30, 1), 365);
  let records = db.getTestHistory(args.repositoryId, days);

  if (args.module) {
    const mod = args.module.toLowerCase();
    records = records.filter((r) => r.module.toLowerCase().includes(mod));
  }

  const failures = records.filter((r) => !r.passed);

  return {
    totalRuns: records.length,
    failureCount: failures.length,
    failureRate: records.length > 0 ? Number((failures.length / records.length).toFixed(3)) : 0,
    records: records.slice(0, 100),
  };
}
