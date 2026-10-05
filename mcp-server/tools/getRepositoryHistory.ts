import { MCPToolDefinition } from '../types';
import { db } from '../../server/database/db';

export const getRepositoryHistoryDefinition: MCPToolDefinition = {
  name: 'get_repository_history',
  description: 'Retrieves aggregated engineering history across tests, builds, maintenance events, and hotspots for a repository.',
  inputSchema: {
    type: 'object',
    properties: {
      repositoryId: {
        type: 'string',
        description: 'Optional ID of the repository to query.',
      },
      days: {
        type: 'number',
        description: 'Lookback window in days (default: 30).',
      },
    },
    required: [],
  },
};

export async function executeGetRepositoryHistory(args: { repositoryId?: string; days?: number }) {
  const days = Math.min(Math.max(args.days || 30, 1), 365);
  const repoId = args.repositoryId;

  const tests = db.getTestHistory(repoId, days);
  const builds = db.getBuildHistory(repoId, days);
  const security = db.getSecurityHistory(repoId, days);
  const dependencies = db.getDependencyHistory(repoId);
  const maintenance = db.getMaintenanceHistory(repoId, days);
  const hotspots = db.getChangeHotspots(repoId);

  const testFailures = tests.filter((t) => !t.passed).length;
  const buildFailures = builds.filter((b) => b.status === 'failure').length;

  return {
    periodDays: days,
    summary: {
      totalTestRuns: tests.length,
      testFailures,
      totalBuilds: builds.length,
      buildFailures,
      securityFindings: security.length,
      outdatedDependencies: dependencies.filter((d) => d.isOutdated).length,
      maintenanceEvents: maintenance.length,
      hotspotCount: hotspots.length,
    },
    hotspots,
  };
}
