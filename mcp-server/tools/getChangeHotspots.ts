import { MCPToolDefinition } from '../types';
import { db } from '../../server/database/db';

export const getChangeHotspotsDefinition: MCPToolDefinition = {
  name: 'get_change_hotspots',
  description: 'Identifies frequently modified modules, churn frequency, and correlation with test failures.',
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

export async function executeGetChangeHotspots(args: { repositoryId?: string }) {
  const hotspots = db.getChangeHotspots(args.repositoryId);

  return {
    hotspotsCount: hotspots.length,
    hotspots,
  };
}
