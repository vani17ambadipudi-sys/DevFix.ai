import { MCPToolDefinition } from '../types';
import { db } from '../../server/database/db';

export const getMaintenanceHistoryDefinition: MCPToolDefinition = {
  name: 'get_maintenance_history',
  description: 'Retrieves chronological record of past bug fixes, emergency patches, and refactors.',
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
      area: {
        type: 'string',
        description: 'Optional filter by module path (e.g. "src/payments").',
      },
    },
    required: [],
  },
};

export async function executeGetMaintenanceHistory(args: { repositoryId?: string; days?: number; area?: string }) {
  const days = Math.min(Math.max(args.days || 30, 1), 365);
  let records = db.getMaintenanceHistory(args.repositoryId, days);

  if (args.area) {
    const area = args.area.toLowerCase();
    records = records.filter((m) => m.area.toLowerCase().includes(area));
  }

  return {
    totalEvents: records.length,
    records,
  };
}
