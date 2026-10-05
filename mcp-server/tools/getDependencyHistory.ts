import { MCPToolDefinition } from '../types';
import { db } from '../../server/database/db';

export const getDependencyHistoryDefinition: MCPToolDefinition = {
  name: 'get_dependency_history',
  description: 'Retrieves package dependency inventory, outdated package counts, and version vulnerabilities.',
  inputSchema: {
    type: 'object',
    properties: {
      repositoryId: {
        type: 'string',
        description: 'Optional target repository ID.',
      },
    },
    required: [],
  },
};

export async function executeGetDependencyHistory(args: { repositoryId?: string }) {
  const records = db.getDependencyHistory(args.repositoryId);
  const outdated = records.filter((d) => d.isOutdated);
  const vulnerable = records.filter((d) => d.vulnerabilityCount > 0);

  return {
    totalDependencies: records.length,
    outdatedCount: outdated.length,
    vulnerableCount: vulnerable.length,
    records,
  };
}
