import { config } from '../config/env';
import { logger } from '../observability/logger';

export interface WorkflowRunSummary {
  id: number;
  name: string;
  headBranch: string;
  headSha: string;
  headShaShort: string;
  event: string;
  status: 'queued' | 'in_progress' | 'completed' | 'waiting';
  conclusion: 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | null;
  workflowUrl: string;
  createdAt: string;
  updatedAt: string;
  durationSeconds: number;
  author: string;
  commitMessage: string;
  stages: {
    ciStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    lintStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    typecheckStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    unitTestStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    integrationTestStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    buildFrontendStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    buildBackendStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    dockerValidationStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
    deploymentStatus: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  };
}

export interface PipelineFailure {
  id: number;
  name: string;
  headBranch: string;
  headShaShort: string;
  commitMessage: string;
  failedAt: string;
  failedJobName?: string;
  failedStepName?: string;
  htmlUrl: string;
}

export interface CicdStatusResponse {
  configured: boolean;
  repository?: string;
  hasToken?: boolean;
  message?: string;
  latestRun: WorkflowRunSummary | null;
  lastSuccessfulDeployment: {
    deployedAt: string;
    commitShaShort: string;
    headBranch: string;
    environment: string;
    workflowRunId: number;
  } | null;
  recentFailures: PipelineFailure[];
  renderDeployment: {
    hookConfigured: boolean;
    serviceIdConfigured: boolean;
    lastTriggeredStatus?: string;
    productionHealthUrl?: string;
  };
  pipelineDefinition: {
    workflowPath: string;
    triggers: string[];
    requiredStages: string[];
  };
}

export class CicdService {
  private static runtimeConfig = {
    githubRepository: process.env.GITHUB_REPOSITORY || '',
    githubToken: process.env.GITHUB_TOKEN || '',
    renderDeployHookUrl: process.env.RENDER_DEPLOY_HOOK_URL || '',
    renderHealthUrl: process.env.RENDER_HEALTH_URL || '',
  };

  public static updateConfig(newConfig: {
    githubRepository?: string;
    githubToken?: string;
    renderDeployHookUrl?: string;
    renderHealthUrl?: string;
  }) {
    if (newConfig.githubRepository !== undefined) {
      this.runtimeConfig.githubRepository = newConfig.githubRepository.trim();
    }
    if (newConfig.githubToken !== undefined) {
      this.runtimeConfig.githubToken = newConfig.githubToken.trim();
    }
    if (newConfig.renderDeployHookUrl !== undefined) {
      this.runtimeConfig.renderDeployHookUrl = newConfig.renderDeployHookUrl.trim();
    }
    if (newConfig.renderHealthUrl !== undefined) {
      this.runtimeConfig.renderHealthUrl = newConfig.renderHealthUrl.trim();
    }
  }

  public static getConfig() {
    return {
      githubRepository: this.runtimeConfig.githubRepository || process.env.GITHUB_REPOSITORY || '',
      hasToken: Boolean(this.runtimeConfig.githubToken || process.env.GITHUB_TOKEN),
      renderDeployHookUrl: this.runtimeConfig.renderDeployHookUrl || process.env.RENDER_DEPLOY_HOOK_URL || '',
      renderHealthUrl: this.runtimeConfig.renderHealthUrl || process.env.RENDER_HEALTH_URL || '',
    };
  }

  private static getGitHubHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'DevFix-AI-Production-CI',
    };
    const token = this.runtimeConfig.githubToken || process.env.GITHUB_TOKEN;
    if (token && token.trim()) {
      headers.Authorization = `token ${token.trim()}`;
    }
    return headers;
  }

  public static async resolveRepository(inputRepo: string): Promise<string> {
    const trimmed = (inputRepo || '').trim();
    if (!trimmed) return '';
    if (trimmed.includes('/')) return trimmed;

    // Repo is bare like "DevFix.ai".
    // 1. Try to query GitHub /user if token is present
    const token = (this.runtimeConfig.githubToken || process.env.GITHUB_TOKEN || '').trim();
    if (token) {
      try {
        const userRes = await fetch('https://api.github.com/user', {
          headers: this.getGitHubHeaders(),
          signal: AbortSignal.timeout(3500),
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData && userData.login) {
            return `${userData.login}/${trimmed}`;
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. Fallback to vani17ambadipudi
    return `vani17ambadipudi/${trimmed}`;
  }

  public static normalizeHealthUrl(url?: string): string {
    if (!url || !url.trim()) return `${config.appUrl}/api/health`;
    let clean = url.trim().split('#')[0]; // remove #production fragment
    if (clean.endsWith('/')) clean = clean.slice(0, -1);
    if (clean && !clean.endsWith('/api/health') && !clean.endsWith('/health')) {
      clean = `${clean}/api/health`;
    }
    return clean;
  }

  public static async getPipelineStatus(): Promise<CicdStatusResponse> {
    const rawRepo = this.runtimeConfig.githubRepository || process.env.GITHUB_REPOSITORY || '';
    const repo = await this.resolveRepository(rawRepo);
    const hasToken = Boolean((this.runtimeConfig.githubToken || process.env.GITHUB_TOKEN)?.trim());
    const renderHookConfigured = Boolean(
      (this.runtimeConfig.renderDeployHookUrl || process.env.RENDER_DEPLOY_HOOK_URL)?.trim()
    );
    const renderServiceIdConfigured = Boolean(
      process.env.RENDER_SERVICE_ID && process.env.RENDER_SERVICE_ID.trim()
    );
    const productionHealthUrl = this.normalizeHealthUrl(
      this.runtimeConfig.renderHealthUrl || process.env.RENDER_HEALTH_URL
    );

    const baseDefinition = {
      workflowPath: '.github/workflows/ci.yml',
      triggers: ['push to main', 'pull_request to main'],
      requiredStages: [
        'Checkout Source',
        'Setup Node.js 22',
        'Setup Python 3.10',
        'Install NPM Dependencies (npm ci)',
        'Install Python Dependencies',
        'Lint (npm run lint)',
        'TypeScript Typecheck (npm run typecheck)',
        'Unit Tests (npm run test:unit)',
        'Integration Tests (npm run test:integration)',
        'Build Frontend (npm run build:frontend)',
        'Build Backend (npm run build:backend)',
        'Docker Build Validation',
        'Render CD Deployment (main only)',
        'Post-Deploy Health Check',
      ],
    };

    if (!repo) {
      return {
        configured: false,
        hasToken,
        message:
          'GitHub API integration is unconfigured. Set GITHUB_REPOSITORY (e.g. "vani17ambadipudi/DevFix.ai") and optional GITHUB_TOKEN to stream live GitHub Actions workflow telemetry.',
        latestRun: null,
        lastSuccessfulDeployment: null,
        recentFailures: [],
        renderDeployment: {
          hookConfigured: renderHookConfigured,
          serviceIdConfigured: renderServiceIdConfigured,
          productionHealthUrl,
        },
        pipelineDefinition: baseDefinition,
      };
    }

    try {
      const runsUrl = `https://api.github.com/repos/${repo}/actions/runs?per_page=15`;
      const runsRes = await fetch(runsUrl, {
        headers: this.getGitHubHeaders(),
        signal: AbortSignal.timeout(8000),
      });

      if (!runsRes.ok) {
        if (runsRes.status === 404) {
          return {
            configured: true,
            repository: repo,
            hasToken,
            message: `Repository "${repo}" is configured. GitHub returned 404 (waiting for initial git push or repository creation on GitHub). Local CI/CD checks and simulation are active below.`,
            latestRun: null,
            lastSuccessfulDeployment: null,
            recentFailures: [],
            renderDeployment: {
              hookConfigured: renderHookConfigured,
              serviceIdConfigured: renderServiceIdConfigured,
              productionHealthUrl,
            },
            pipelineDefinition: baseDefinition,
          };
        }

        const errorText = await runsRes.text();
        logger.warn('github_api_error', 'cicd_status', `GitHub API error (${runsRes.status}): ${errorText}`);
        return {
          configured: true,
          repository: repo,
          hasToken,
          message: `Connected to repository "${repo}". GitHub API returned HTTP ${runsRes.status}: ${runsRes.statusText}.`,
          latestRun: null,
          lastSuccessfulDeployment: null,
          recentFailures: [],
          renderDeployment: {
            hookConfigured: renderHookConfigured,
            serviceIdConfigured: renderServiceIdConfigured,
            productionHealthUrl,
          },
          pipelineDefinition: baseDefinition,
        };
      }

      const runsData = await runsRes.json();
      const workflowRuns = runsData.workflow_runs || [];

      if (workflowRuns.length === 0) {
        return {
          configured: true,
          repository: repo,
          hasToken,
          message: 'No workflow runs found yet for repository. Push to main or open a pull request to trigger the pipeline.',
          latestRun: null,
          lastSuccessfulDeployment: null,
          recentFailures: [],
          renderDeployment: {
            hookConfigured: renderHookConfigured,
            serviceIdConfigured: renderServiceIdConfigured,
            productionHealthUrl,
          },
          pipelineDefinition: baseDefinition,
        };
      }

      const latest = workflowRuns[0];

      // Fetch jobs for latest run
      let jobs: any[] = [];
      try {
        const jobsRes = await fetch(latest.jobs_url, {
          headers: this.getGitHubHeaders(),
          signal: AbortSignal.timeout(5000),
        });
        if (jobsRes.ok) {
          const jobsData = await jobsRes.json();
          jobs = jobsData.jobs || [];
        }
      } catch (err: any) {
        logger.warn('github_jobs_fetch_error', 'cicd_jobs', err.message);
      }

      // Map job steps to stages
      const stages = this.mapJobsToStages(jobs, latest);

      const createdAt = new Date(latest.created_at).getTime();
      const updatedAt = new Date(latest.updated_at).getTime();
      const durationSeconds = Math.max(0, Math.floor((updatedAt - createdAt) / 1000));

      const latestSummary: WorkflowRunSummary = {
        id: latest.id,
        name: latest.name,
        headBranch: latest.head_branch || 'main',
        headSha: latest.head_sha || '',
        headShaShort: (latest.head_sha || '').slice(0, 7),
        event: latest.event,
        status: latest.status,
        conclusion: latest.conclusion,
        workflowUrl: latest.html_url,
        createdAt: latest.created_at,
        updatedAt: latest.updated_at,
        durationSeconds,
        author: latest.head_commit?.author?.name || latest.actor?.login || 'Developer',
        commitMessage: latest.head_commit?.message || 'Update code and configuration',
        stages,
      };

      // Find last successful deployment
      let lastDeployment: CicdStatusResponse['lastSuccessfulDeployment'] = null;
      for (const run of workflowRuns) {
        if (
          run.status === 'completed' &&
          run.conclusion === 'success' &&
          run.head_branch === 'main'
        ) {
          lastDeployment = {
            deployedAt: run.updated_at,
            commitShaShort: (run.head_sha || '').slice(0, 7),
            headBranch: run.head_branch,
            environment: 'Render Production',
            workflowRunId: run.id,
          };
          break;
        }
      }

      // Find recent pipeline failures
      const recentFailures: PipelineFailure[] = [];
      for (const run of workflowRuns) {
        if (run.conclusion === 'failure') {
          recentFailures.push({
            id: run.id,
            name: run.name,
            headBranch: run.head_branch || 'main',
            headShaShort: (run.head_sha || '').slice(0, 7),
            commitMessage: run.head_commit?.message || 'Pipeline failed',
            failedAt: run.updated_at,
            htmlUrl: run.html_url,
          });
          if (recentFailures.length >= 5) break;
        }
      }

      return {
        configured: true,
        repository: repo,
        hasToken,
        latestRun: latestSummary,
        lastSuccessfulDeployment: lastDeployment,
        recentFailures,
        renderDeployment: {
          hookConfigured: renderHookConfigured,
          serviceIdConfigured: renderServiceIdConfigured,
          productionHealthUrl,
        },
        pipelineDefinition: baseDefinition,
      };
    } catch (err: any) {
      logger.error('cicd_service_fetch_error', 'cicd_error', 'ERR_GITHUB_API', err.message, 'cicdService');
      return {
        configured: false,
        repository: repo,
        hasToken,
        message: `Network error connecting to GitHub API: ${err.message}`,
        latestRun: null,
        lastSuccessfulDeployment: null,
        recentFailures: [],
        renderDeployment: {
          hookConfigured: renderHookConfigured,
          serviceIdConfigured: renderServiceIdConfigured,
          productionHealthUrl,
        },
        pipelineDefinition: baseDefinition,
      };
    }
  }

  private static mapJobsToStages(jobs: any[], run: any): WorkflowRunSummary['stages'] {
    const defaultStatus =
      run.status === 'completed'
        ? run.conclusion === 'success'
          ? 'success'
          : 'failed'
        : run.status === 'in_progress'
        ? 'running'
        : 'pending';

    const stages: WorkflowRunSummary['stages'] = {
      ciStatus: defaultStatus,
      lintStatus: 'pending',
      typecheckStatus: 'pending',
      unitTestStatus: 'pending',
      integrationTestStatus: 'pending',
      buildFrontendStatus: 'pending',
      buildBackendStatus: 'pending',
      dockerValidationStatus: 'pending',
      deploymentStatus: 'pending',
    };

    if (!jobs || jobs.length === 0) {
      return stages;
    }

    for (const job of jobs) {
      const steps = job.steps || [];
      for (const step of steps) {
        const stepName = (step.name || '').toLowerCase();
        const stepStatus =
          step.status === 'completed'
            ? step.conclusion === 'success'
              ? 'success'
              : step.conclusion === 'skipped'
              ? 'skipped'
              : 'failed'
            : step.status === 'in_progress'
            ? 'running'
            : 'pending';

        if (stepName.includes('lint')) {
          stages.lintStatus = stepStatus;
        }
        if (stepName.includes('type') || stepName.includes('tsc')) {
          stages.typecheckStatus = stepStatus;
        }
        if (stepName.includes('unit test')) {
          stages.unitTestStatus = stepStatus;
        }
        if (stepName.includes('integration test')) {
          stages.integrationTestStatus = stepStatus;
        }
        if (stepName.includes('frontend') || (stepName.includes('vite') && stepName.includes('build'))) {
          stages.buildFrontendStatus = stepStatus;
        }
        if (stepName.includes('backend') || (stepName.includes('esbuild') && stepName.includes('build'))) {
          stages.buildBackendStatus = stepStatus;
        }
        if (stepName.includes('docker')) {
          stages.dockerValidationStatus = stepStatus;
        }
        if (stepName.includes('deploy') || stepName.includes('render')) {
          stages.deploymentStatus = stepStatus;
        }
      }

      // Check deploy job if separated
      const jobName = (job.name || '').toLowerCase();
      if (jobName.includes('deploy') || jobName.includes('render')) {
        stages.deploymentStatus =
          job.status === 'completed'
            ? job.conclusion === 'success'
              ? 'success'
              : job.conclusion === 'skipped'
              ? 'skipped'
              : 'failed'
            : job.status === 'in_progress'
            ? 'running'
            : 'pending';
      }
    }

    return stages;
  }

  /**
   * Triggers a test verification of the Render health endpoint
   */
  public static async verifyHealthEndpoint(targetUrl?: string): Promise<{
    success: boolean;
    statusCode: number;
    responseTimeMs: number;
    data?: any;
    error?: string;
  }> {
    const url = targetUrl || process.env.RENDER_HEALTH_URL || `${config.appUrl}/api/health`;
    const start = Date.now();
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      const responseTimeMs = Date.now() - start;
      const data = await res.json().catch(() => null);

      return {
        success: res.ok,
        statusCode: res.status,
        responseTimeMs,
        data,
      };
    } catch (err: any) {
      return {
        success: false,
        statusCode: 0,
        responseTimeMs: Date.now() - start,
        error: err.message,
      };
    }
  }
}
