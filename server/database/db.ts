import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config/env';
import { logger } from '../observability/logger';
import {
  TestHistoryRecord,
  BuildHistoryRecord,
  SecurityHistoryRecord,
  DependencyHistoryRecord,
  MaintenanceHistoryRecord,
  PerformanceHistoryRecord,
  ChangeHotspot,
  PredictionRunRecord,
  PreventiveRecommendation,
  RecommendationStatus,
} from '../../src/types/predictionTypes';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  role: 'developer' | 'admin';
  createdAt: string;
}

export interface DebugSessionRecord {
  id: string;
  userId?: string;
  language: string;
  originalCode: string;
  problemSummary: string;
  finalFixedCode: string;
  status: 'clean' | 'fixed' | 'syntax_error' | 'runtime_error' | 'logical_error';
  modelUsed: string;
  attempts: number;
  durationMs: number;
  verificationPassed: boolean;
  mcpToolsUsed: string[];
  createdAt: string;
}

export interface RepositoryRecord {
  id: string;
  userId?: string;
  name: string;
  originalPath: string;
  workspacePath: string;
  languages: string[];
  frameworks: string[];
  packageManager?: string;
  testFramework?: string;
  entryPoints: string[];
  filesCount: number;
  status: 'ready' | 'analyzing' | 'archived';
  createdAt: string;
  expiresAt: string;
}

export interface IssueRecord {
  id: string;
  repositoryId: string;
  userId?: string;
  title: string;
  description: string;
  errorLogs?: string;
  reproductionCommand?: string;
  reproductionResult?: {
    attempted: boolean;
    failedAsExpected: boolean;
    output: string;
    exitCode?: number;
  };
  rootCause?: {
    summary: string;
    affectedFiles: string[];
    evidence: string[];
  };
  status: 'open' | 'reproduced' | 'in_progress' | 'resolved' | 'failed';
  createdAt: string;
}

export interface PatchRecord {
  id: string;
  issueId: string;
  repositoryId: string;
  plan: {
    targetFiles: string[];
    summary: string;
    operations: Array<{ file: string; operation: 'modify' | 'create' | 'delete'; description: string }>;
  };
  diff: string;
  changedFiles: string[];
  status: 'proposed' | 'testing' | 'verified' | 'approved' | 'rejected' | 'rolled_back';
  verification: {
    reproductionPassed: boolean;
    existingTestsPassed: boolean;
    regressionsDetected: number;
    details: string;
  };
  review: {
    approved: boolean;
    summary: string;
    riskLevel: 'low' | 'medium' | 'high';
    concerns: string[];
  };
  rejectionReason?: string;
  attempts: number;
  createdAt: string;
}

export interface CheckpointRecord {
  id: string;
  repositoryId: string;
  patchId?: string;
  backupPath: string;
  label: string;
  createdAt: string;
}

interface DatabaseSchema {
  version: number;
  users: UserRecord[];
  sessions: DebugSessionRecord[];
  repositories: RepositoryRecord[];
  issues: IssueRecord[];
  patches: PatchRecord[];
  checkpoints: CheckpointRecord[];
  // Phase 9 & 10 Predictive & Continuous Maintenance Records
  predictionRuns: PredictionRunRecord[];
  testHistory: TestHistoryRecord[];
  buildHistory: BuildHistoryRecord[];
  securityHistory: SecurityHistoryRecord[];
  dependencyHistory: DependencyHistoryRecord[];
  maintenanceHistory: MaintenanceHistoryRecord[];
  performanceHistory: PerformanceHistoryRecord[];
  changeHotspots: ChangeHotspot[];
  preventiveRecommendations: PreventiveRecommendation[];
}

export class Database {
  private filePath: string;
  private data: DatabaseSchema;
  private isLoaded: boolean = false;

  constructor() {
    this.filePath = path.resolve(process.cwd(), config.databasePath);
    this.data = {
      version: 3,
      users: [],
      sessions: [],
      repositories: [],
      issues: [],
      patches: [],
      checkpoints: [],
      predictionRuns: [],
      testHistory: [],
      buildHistory: [],
      securityHistory: [],
      dependencyHistory: [],
      maintenanceHistory: [],
      performanceHistory: [],
      changeHotspots: [],
      preventiveRecommendations: [],
    };
    this.init();
  }

  private init() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        const parsed = JSON.parse(raw);
        this.data = {
          version: 3,
          users: parsed.users || [],
          sessions: parsed.sessions || [],
          repositories: parsed.repositories || [],
          issues: parsed.issues || [],
          patches: parsed.patches || [],
          checkpoints: parsed.checkpoints || [],
          predictionRuns: parsed.predictionRuns || [],
          testHistory: parsed.testHistory || [],
          buildHistory: parsed.buildHistory || [],
          securityHistory: parsed.securityHistory || [],
          dependencyHistory: parsed.dependencyHistory || [],
          maintenanceHistory: parsed.maintenanceHistory || [],
          performanceHistory: parsed.performanceHistory || [],
          changeHotspots: parsed.changeHotspots || [],
          preventiveRecommendations: parsed.preventiveRecommendations || [],
        };
      } else {
        this.seedDemoUser();
      }

      // If test history or hotspots are empty, seed realistic engineering telemetry
      if (this.data.testHistory.length === 0) {
        this.seedHistoricalTelemetry();
      }

      this.persist();
      this.isLoaded = true;
    } catch (err: any) {
      console.error('[Database Init Error]:', err.message);
      this.seedDemoUser();
      this.seedHistoricalTelemetry();
      this.isLoaded = true;
    }
  }

  private seedDemoUser() {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.scryptSync('Developer123!', salt, 64).toString('hex');
    this.data.users.push({
      id: 'user_demo_01',
      email: 'developer@devfix.ai',
      name: 'DevFix Engineer',
      passwordHash,
      salt,
      role: 'developer',
      createdAt: new Date().toISOString(),
    });
  }

  private seedHistoricalTelemetry() {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // 1. Test History (Section 3: payments/ 8 test failures, auth/ 6 test failures, reports/ 2 failures, users/ 0 failures)
    const testRecords: TestHistoryRecord[] = [
      // Payments module test failures
      { id: 'th_pay_01', repositoryId: 'repo_demo_01', module: 'src/payments', testName: 'PaymentGateway.processTransaction', passed: false, durationMs: 1420, timestamp: new Date(now - 2 * day).toISOString(), errorMessage: 'GatewayTimeoutException: upstream connection dropped' },
      { id: 'th_pay_02', repositoryId: 'repo_demo_01', module: 'src/payments', testName: 'StripeWebhook.verifySignature', passed: false, durationMs: 890, timestamp: new Date(now - 5 * day).toISOString(), errorMessage: 'SignatureMismatch: payload timestamp stale' },
      { id: 'th_pay_03', repositoryId: 'repo_demo_01', module: 'src/payments', testName: 'CurrencyConverter.toSubunits', passed: false, durationMs: 310, timestamp: new Date(now - 7 * day).toISOString(), errorMessage: 'PrecisionError: IEEE754 floating point rounding drift' },
      { id: 'th_pay_04', repositoryId: 'repo_demo_01', module: 'src/payments', testName: 'SubscriptionBilling.renewPlan', passed: false, durationMs: 1980, timestamp: new Date(now - 11 * day).toISOString(), errorMessage: 'DeadlockDetected: concurrent renewal lock timeout' },
      { id: 'th_pay_05', repositoryId: 'repo_demo_01', module: 'src/payments', testName: 'PaymentMethod.attachCustomer', passed: false, durationMs: 760, timestamp: new Date(now - 15 * day).toISOString(), errorMessage: 'NullPointerException: customerId undefined' },
      { id: 'th_pay_06', repositoryId: 'repo_demo_01', module: 'src/payments', testName: 'RefundService.issuePartialRefund', passed: false, durationMs: 1250, timestamp: new Date(now - 18 * day).toISOString(), errorMessage: 'InvalidAmountException: partial refund exceeds balance' },
      { id: 'th_pay_07', repositoryId: 'repo_demo_01', module: 'src/payments', testName: 'FraudCheck.evaluateVelocity', passed: false, durationMs: 820, timestamp: new Date(now - 22 * day).toISOString(), errorMessage: 'RedisConnectionError: pool exhausted' },
      { id: 'th_pay_08', repositoryId: 'repo_demo_01', module: 'src/payments', testName: 'CheckoutSession.createSession', passed: false, durationMs: 1540, timestamp: new Date(now - 27 * day).toISOString(), errorMessage: 'HTTP 500: Missing line items array' },
      
      // Auth module test failures
      { id: 'th_auth_01', repositoryId: 'repo_demo_01', module: 'src/auth', testName: 'AuthRoute.postLoginEmptyEmail', passed: false, durationMs: 430, timestamp: new Date(now - 1 * day).toISOString(), errorMessage: 'TypeError: Cannot read properties of undefined' },
      { id: 'th_auth_02', repositoryId: 'repo_demo_01', module: 'src/auth', testName: 'JwtService.verifyExpiredToken', passed: false, durationMs: 210, timestamp: new Date(now - 6 * day).toISOString(), errorMessage: 'TokenExpiredError: jwt expired at 1791000' },
      { id: 'th_auth_03', repositoryId: 'repo_demo_01', module: 'src/auth', testName: 'RefreshToken.rotateSession', passed: false, durationMs: 380, timestamp: new Date(now - 12 * day).toISOString(), errorMessage: 'TokenReuseDetected: old refresh token presented' },
      { id: 'th_auth_04', repositoryId: 'repo_demo_01', module: 'src/auth', testName: 'PasswordReset.validateToken', passed: false, durationMs: 290, timestamp: new Date(now - 17 * day).toISOString(), errorMessage: 'TokenMalformed: unexpected base64 padding' },
      { id: 'th_auth_05', repositoryId: 'repo_demo_01', module: 'src/auth', testName: 'OAuthCallback.handleGoogleCode', passed: false, durationMs: 910, timestamp: new Date(now - 23 * day).toISOString(), errorMessage: 'StateParameterMismatch' },
      { id: 'th_auth_06', repositoryId: 'repo_demo_01', module: 'src/auth', testName: 'SessionMiddleware.enforceMaxAge', passed: false, durationMs: 180, timestamp: new Date(now - 28 * day).toISOString(), errorMessage: 'ClockSkewError' },

      // Reports module
      { id: 'th_rep_01', repositoryId: 'repo_demo_01', module: 'src/reports', testName: 'CsvExport.generateSalesRollup', passed: false, durationMs: 3400, timestamp: new Date(now - 8 * day).toISOString(), errorMessage: 'MaxMemoryLimitExceeded: heap allocation failed' },
      { id: 'th_rep_02', repositoryId: 'repo_demo_01', module: 'src/reports', testName: 'PdfReport.renderTemplate', passed: false, durationMs: 2900, timestamp: new Date(now - 21 * day).toISOString(), errorMessage: 'FontNotFoundException: Helvetica' },

      // Users module passing tests
      { id: 'th_usr_01', repositoryId: 'repo_demo_01', module: 'src/users', testName: 'UserProfile.getDetails', passed: true, durationMs: 110, timestamp: new Date(now - 3 * day).toISOString() },
      { id: 'th_usr_02', repositoryId: 'repo_demo_01', module: 'src/users', testName: 'UserPreferences.updateTheme', passed: true, durationMs: 95, timestamp: new Date(now - 10 * day).toISOString() }
    ];

    // 2. Build History (Past 4 weeks showing increase in failures)
    const buildRecords: BuildHistoryRecord[] = [
      { id: 'bh_01', repositoryId: 'repo_demo_01', status: 'failure', durationMs: 42000, timestamp: new Date(now - 1 * day).toISOString(), errorStep: 'typecheck - src/payments/gateway.ts' },
      { id: 'bh_02', repositoryId: 'repo_demo_01', status: 'success', durationMs: 38000, timestamp: new Date(now - 4 * day).toISOString() },
      { id: 'bh_03', repositoryId: 'repo_demo_01', status: 'failure', durationMs: 44000, timestamp: new Date(now - 9 * day).toISOString(), errorStep: 'lint - unexpected any in src/payments' },
      { id: 'bh_04', repositoryId: 'repo_demo_01', status: 'success', durationMs: 36000, timestamp: new Date(now - 16 * day).toISOString() },
      { id: 'bh_05', repositoryId: 'repo_demo_01', status: 'failure', durationMs: 41000, timestamp: new Date(now - 24 * day).toISOString(), errorStep: 'npm test - 2 failures' },
      { id: 'bh_06', repositoryId: 'repo_demo_01', status: 'success', durationMs: 35000, timestamp: new Date(now - 29 * day).toISOString() }
    ];

    // 3. Security History
    const secRecords: SecurityHistoryRecord[] = [
      { id: 'sec_01', repositoryId: 'repo_demo_01', severity: 'medium', title: 'Timing Attack in Signature Verification', module: 'src/payments/webhook.ts', cveOrIdentifier: 'CWE-208', timestamp: new Date(now - 4 * day).toISOString() },
      { id: 'sec_02', repositoryId: 'repo_demo_01', severity: 'low', title: 'Permissive CORS configuration on internal webhook endpoint', module: 'src/payments/routes.ts', cveOrIdentifier: 'CWE-942', timestamp: new Date(now - 14 * day).toISOString() },
      { id: 'sec_03', repositoryId: 'repo_demo_01', severity: 'medium', title: 'Hardcoded Fallback JWT Secret in Test Helpers', module: 'src/auth/jwtHelper.ts', cveOrIdentifier: 'CWE-798', timestamp: new Date(now - 20 * day).toISOString() }
    ];

    // 4. Dependency History
    const depRecords: DependencyHistoryRecord[] = [
      { id: 'dep_01', repositoryId: 'repo_demo_01', packageName: 'stripe', currentVersion: '12.4.0', latestVersion: '14.18.0', isOutdated: true, vulnerabilityCount: 1, timestamp: new Date(now - 3 * day).toISOString() },
      { id: 'dep_02', repositoryId: 'repo_demo_01', packageName: 'jsonwebtoken', currentVersion: '9.0.0', latestVersion: '9.0.3', isOutdated: true, vulnerabilityCount: 0, timestamp: new Date(now - 10 * day).toISOString() },
      { id: 'dep_03', repositoryId: 'repo_demo_01', packageName: 'express', currentVersion: '4.21.2', latestVersion: '4.21.2', isOutdated: false, vulnerabilityCount: 0, timestamp: new Date(now - 12 * day).toISOString() },
      { id: 'dep_04', repositoryId: 'repo_demo_01', packageName: 'dotenv', currentVersion: '16.0.0', latestVersion: '17.2.3', isOutdated: true, vulnerabilityCount: 0, timestamp: new Date(now - 20 * day).toISOString() }
    ];

    // 5. Maintenance History
    const maintRecords: MaintenanceHistoryRecord[] = [
      { id: 'mh_01', repositoryId: 'repo_demo_01', area: 'src/payments', type: 'bug_fix', description: 'Emergency fix: handle stripe timeout error in webhook', timestamp: new Date(now - 3 * day).toISOString() },
      { id: 'mh_02', repositoryId: 'repo_demo_01', area: 'src/payments', type: 'patch', description: 'Patch currency rounding precision drift', timestamp: new Date(now - 8 * day).toISOString() },
      { id: 'mh_03', repositoryId: 'repo_demo_01', area: 'src/payments', type: 'refactor', description: 'Extract payment retry backoff into helper', timestamp: new Date(now - 14 * day).toISOString() },
      { id: 'mh_04', repositoryId: 'repo_demo_01', area: 'src/auth', type: 'bug_fix', description: 'Fix empty email validation 500 error in login route', timestamp: new Date(now - 2 * day).toISOString() },
      { id: 'mh_05', repositoryId: 'repo_demo_01', area: 'src/auth', type: 'patch', description: 'Sanitize authorization header bearer prefix', timestamp: new Date(now - 19 * day).toISOString() }
    ];

    // 6. Performance History (Latency drift)
    const perfRecords: PerformanceHistoryRecord[] = [
      { id: 'pf_01', repositoryId: 'repo_demo_01', endpoint: 'POST /api/payments/checkout', p95DurationMs: 780, avgDurationMs: 410, timestamp: new Date(now - 2 * day).toISOString() },
      { id: 'pf_02', repositoryId: 'repo_demo_01', endpoint: 'POST /api/payments/checkout', p95DurationMs: 690, avgDurationMs: 380, timestamp: new Date(now - 9 * day).toISOString() },
      { id: 'pf_03', repositoryId: 'repo_demo_01', endpoint: 'POST /api/payments/checkout', p95DurationMs: 520, avgDurationMs: 290, timestamp: new Date(now - 16 * day).toISOString() },
      { id: 'pf_04', repositoryId: 'repo_demo_01', endpoint: 'POST /api/payments/checkout', p95DurationMs: 420, avgDurationMs: 240, timestamp: new Date(now - 28 * day).toISOString() },
      { id: 'pf_05', repositoryId: 'repo_demo_01', endpoint: 'POST /api/auth/login', p95DurationMs: 240, avgDurationMs: 140, timestamp: new Date(now - 3 * day).toISOString() }
    ];

    // 7. Change Hotspots (Section 10)
    const hotspots: ChangeHotspot[] = [
      {
        path: 'src/payments',
        changesCount: 5,
        failureCount: 8,
        maintenanceCount: 3,
        riskScore: 84,
        lastModifiedAt: new Date(now - 2 * day).toISOString(),
        complexityScore: 19
      },
      {
        path: 'src/auth',
        changesCount: 4,
        failureCount: 6,
        maintenanceCount: 2,
        riskScore: 68,
        lastModifiedAt: new Date(now - 1 * day).toISOString(),
        complexityScore: 14
      },
      {
        path: 'src/reports',
        changesCount: 2,
        failureCount: 2,
        maintenanceCount: 1,
        riskScore: 38,
        lastModifiedAt: new Date(now - 8 * day).toISOString(),
        complexityScore: 12
      },
      {
        path: 'src/users',
        changesCount: 1,
        failureCount: 0,
        maintenanceCount: 0,
        riskScore: 12,
        lastModifiedAt: new Date(now - 15 * day).toISOString(),
        complexityScore: 6
      }
    ];

    this.data.testHistory = testRecords;
    this.data.buildHistory = buildRecords;
    this.data.securityHistory = secRecords;
    this.data.dependencyHistory = depRecords;
    this.data.maintenanceHistory = maintRecords;
    this.data.performanceHistory = perfRecords;
    this.data.changeHotspots = hotspots;
  }

  private persist() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err: any) {
      console.error('[Database Persist Error]:', err.message);
    }
  }

  // --- User Operations ---
  public findUserByEmail(email: string): UserRecord | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public findUserById(id: string): UserRecord | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  public createUser(email: string, password: string, name: string): Omit<UserRecord, 'passwordHash' | 'salt'> {
    const existing = this.findUserByEmail(email);
    if (existing) {
      throw new Error('User with this email already exists.');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = crypto.scryptSync(password, salt, 64).toString('hex');

    const newUser: UserRecord = {
      id: `usr_${crypto.randomUUID()}`,
      email: email.toLowerCase().trim(),
      name: name.trim(),
      passwordHash,
      salt,
      role: 'developer',
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.persist();

    const { passwordHash: _, salt: __, ...safeUser } = newUser;
    return safeUser;
  }

  public verifyPassword(user: UserRecord, candidate: string): boolean {
    try {
      const hash = crypto.scryptSync(candidate, user.salt, 64).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(user.passwordHash));
    } catch {
      return false;
    }
  }

  // --- Session Operations ---
  public saveSession(session: Omit<DebugSessionRecord, 'id' | 'createdAt'>): DebugSessionRecord {
    const newSession: DebugSessionRecord = {
      ...session,
      id: `sess_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };

    this.data.sessions.unshift(newSession);
    if (this.data.sessions.length > 500) {
      this.data.sessions.pop();
    }
    this.persist();
    return newSession;
  }

  public getSessions(userId?: string): DebugSessionRecord[] {
    if (!userId) {
      return this.data.sessions.slice(0, 100);
    }
    return this.data.sessions.filter((s) => s.userId === userId).slice(0, 100);
  }

  public deleteSession(id: string, userId?: string): boolean {
    const initialLen = this.data.sessions.length;
    this.data.sessions = this.data.sessions.filter((s) => {
      if (s.id !== id) return true;
      if (userId && s.userId && s.userId !== userId) return true;
      return false;
    });

    if (this.data.sessions.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  public clearSessions(userId?: string): void {
    if (!userId) {
      this.data.sessions = [];
    } else {
      this.data.sessions = this.data.sessions.filter((s) => s.userId !== userId);
    }
    this.persist();
  }

  // --- Repository Operations ---
  public saveRepository(repo: any): RepositoryRecord {
    return this.createRepository(repo);
  }

  public createRepository(repo: Omit<RepositoryRecord, 'id' | 'createdAt' | 'expiresAt'>): RepositoryRecord {
    const now = new Date();
    const expires = new Date(now.getTime() + config.workspaceRetentionHours * 60 * 60 * 1000);

    const newRepo: RepositoryRecord = {
      ...repo,
      id: `repo_${crypto.randomUUID()}`,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };

    this.data.repositories.unshift(newRepo);
    this.persist();
    return newRepo;
  }

  public getRepositoryById(id: string): RepositoryRecord | undefined {
    return this.data.repositories.find((r) => r.id === id);
  }

  public getRepositories(userId?: string): RepositoryRecord[] {
    if (!userId) return this.data.repositories;
    return this.data.repositories.filter((r) => !r.userId || r.userId === userId);
  }

  public updateRepositoryStatus(id: string, status: RepositoryRecord['status']): boolean {
    const repo = this.getRepositoryById(id);
    if (!repo) return false;
    repo.status = status;
    this.persist();
    return true;
  }

  public deleteRepository(id: string): boolean {
    const repo = this.getRepositoryById(id);
    if (!repo) return false;

    try {
      if (repo.workspacePath && fs.existsSync(repo.workspacePath)) {
        fs.rmSync(path.dirname(repo.workspacePath), { recursive: true, force: true });
      }
    } catch (err: any) {
      console.warn(`[DeleteRepo warning]: could not delete folder: ${err.message}`);
    }

    this.data.repositories = this.data.repositories.filter((r) => r.id !== id);
    this.data.issues = this.data.issues.filter((i) => i.repositoryId !== id);
    this.data.patches = this.data.patches.filter((p) => p.repositoryId !== id);
    this.data.checkpoints = this.data.checkpoints.filter((c) => c.repositoryId !== id);
    this.persist();
    return true;
  }

  // --- Issue Operations ---
  public saveIssue(issue: any): IssueRecord {
    return this.createIssue(issue);
  }

  public createIssue(issue: Omit<IssueRecord, 'id' | 'createdAt'>): IssueRecord {
    const newIssue: IssueRecord = {
      ...issue,
      id: `issue_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.issues.unshift(newIssue);
    this.persist();
    return newIssue;
  }

  public getIssueById(id: string): IssueRecord | undefined {
    return this.data.issues.find((i) => i.id === id);
  }

  public getIssuesByRepo(repoId: string): IssueRecord[] {
    return this.data.issues.filter((i) => i.repositoryId === repoId);
  }

  public updateIssue(id: string, updates: Partial<IssueRecord>): boolean {
    const idx = this.data.issues.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    this.data.issues[idx] = { ...this.data.issues[idx], ...updates };
    this.persist();
    return true;
  }

  // --- Patch Operations ---
  public savePatch(patch: any): PatchRecord {
    return this.createPatch(patch);
  }

  public createPatch(patch: Omit<PatchRecord, 'id' | 'createdAt'>): PatchRecord {
    const newPatch: PatchRecord = {
      ...patch,
      id: `patch_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.patches.unshift(newPatch);
    this.persist();
    return newPatch;
  }

  public getPatchById(id: string): PatchRecord | undefined {
    return this.data.patches.find((p) => p.id === id);
  }

  public getPatchesByIssue(issueId: string): PatchRecord[] {
    return this.data.patches.filter((p) => p.issueId === issueId);
  }

  public updatePatch(id: string, updates: Partial<PatchRecord>): boolean {
    const idx = this.data.patches.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.data.patches[idx] = { ...this.data.patches[idx], ...updates };
    this.persist();
    return true;
  }

  public updatePatchStatus(id: string, status: PatchRecord['status'], rejectionReason?: string): boolean {
    const patch = this.getPatchById(id);
    if (!patch) return false;
    patch.status = status;
    if (rejectionReason) patch.rejectionReason = rejectionReason;
    this.persist();
    return true;
  }

  // --- Checkpoints ---
  public saveCheckpoint(cp: any): CheckpointRecord {
    return this.createCheckpoint(cp);
  }

  public createCheckpoint(cp: Omit<CheckpointRecord, 'id' | 'createdAt'>): CheckpointRecord {
    const newCp: CheckpointRecord = {
      ...cp,
      id: `cp_${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.checkpoints.unshift(newCp);
    this.persist();
    return newCp;
  }

  public getCheckpointsByRepo(repoId: string): CheckpointRecord[] {
    return this.data.checkpoints.filter((c) => c.repositoryId === repoId);
  }

  public getCheckpointById(id: string): CheckpointRecord | undefined {
    return this.data.checkpoints.find((c) => c.id === id);
  }

  // =========================================================================
  // Phase 9 & 10: Predictive & Continuous Maintenance Data Access
  // =========================================================================

  public getTestHistory(repoId?: string, days: number = 30): TestHistoryRecord[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.data.testHistory.filter((t) => {
      const matchRepo = !repoId || t.repositoryId === repoId || t.repositoryId === 'repo_demo_01';
      const matchTime = new Date(t.timestamp).getTime() >= cutoff;
      return matchRepo && matchTime;
    });
  }

  public recordTestRun(record: Omit<TestHistoryRecord, 'id'>): TestHistoryRecord {
    const item: TestHistoryRecord = {
      ...record,
      id: `th_${crypto.randomUUID().slice(0, 8)}`,
    };
    this.data.testHistory.unshift(item);
    if (this.data.testHistory.length > 2000) this.data.testHistory.pop();
    this.persist();
    return item;
  }

  public saveTestRecord(record: any): void {
    const item: TestHistoryRecord = {
      id: record.id || `th_${crypto.randomUUID().slice(0, 8)}`,
      repositoryId: record.repositoryId || 'repo_demo_01',
      module: record.module || record.testSuite || 'src/payments',
      testName: record.testName || record.testSuite || 'unit_test',
      passed: typeof record.passed === 'boolean' ? record.passed : (record.failed === 0),
      durationMs: record.durationMs || 100,
      timestamp: record.timestamp || new Date().toISOString(),
      errorMessage: record.errorMessage,
    };
    this.data.testHistory.unshift(item);
    if (this.data.testHistory.length > 2000) this.data.testHistory.pop();
    this.persist();
  }

  public getBuildHistory(repoId?: string, days: number = 30): BuildHistoryRecord[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.data.buildHistory.filter((b) => {
      const matchRepo = !repoId || b.repositoryId === repoId || b.repositoryId === 'repo_demo_01';
      const matchTime = new Date(b.timestamp).getTime() >= cutoff;
      return matchRepo && matchTime;
    });
  }

  public recordBuild(record: Omit<BuildHistoryRecord, 'id'>): BuildHistoryRecord {
    const item: BuildHistoryRecord = {
      ...record,
      id: `bh_${crypto.randomUUID().slice(0, 8)}`,
    };
    this.data.buildHistory.unshift(item);
    this.persist();
    return item;
  }

  public saveBuildRecord(record: any): void {
    const item: BuildHistoryRecord = {
      id: record.id || `bh_${crypto.randomUUID().slice(0, 8)}`,
      repositoryId: record.repositoryId || 'repo_demo_01',
      status: record.status === 'success' ? 'success' : 'failure',
      durationMs: record.durationMs || (record.durationSeconds ? record.durationSeconds * 1000 : 10000),
      timestamp: record.timestamp || new Date().toISOString(),
      errorStep: record.errorStep,
    };
    this.data.buildHistory.unshift(item);
    this.persist();
  }

  public saveMaintenanceRecord(record: any): void {
    const item: MaintenanceHistoryRecord = {
      id: record.id || `mh_${crypto.randomUUID().slice(0, 8)}`,
      repositoryId: record.repositoryId || 'repo_demo_01',
      area: record.area || record.module || 'src/payments',
      type: record.type || 'patch',
      description: record.description || 'Maintenance update',
      timestamp: record.timestamp || new Date().toISOString(),
    };
    this.data.maintenanceHistory.unshift(item);
    this.persist();
  }

  public getSecurityHistory(repoId?: string, days: number = 60): SecurityHistoryRecord[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.data.securityHistory.filter((s) => {
      const matchRepo = !repoId || s.repositoryId === repoId || s.repositoryId === 'repo_demo_01';
      const matchTime = new Date(s.timestamp).getTime() >= cutoff;
      return matchRepo && matchTime;
    });
  }

  public recordSecurityFinding(record: Omit<SecurityHistoryRecord, 'id'>): SecurityHistoryRecord {
    const item: SecurityHistoryRecord = {
      ...record,
      id: `sec_${crypto.randomUUID().slice(0, 8)}`,
    };
    this.data.securityHistory.unshift(item);
    this.persist();
    return item;
  }

  public getDependencyHistory(repoId?: string): DependencyHistoryRecord[] {
    return this.data.dependencyHistory.filter((d) => {
      return !repoId || d.repositoryId === repoId || d.repositoryId === 'repo_demo_01';
    });
  }

  public getMaintenanceHistory(repoId?: string, days: number = 30): MaintenanceHistoryRecord[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.data.maintenanceHistory.filter((m) => {
      const matchRepo = !repoId || m.repositoryId === repoId || m.repositoryId === 'repo_demo_01';
      const matchTime = new Date(m.timestamp).getTime() >= cutoff;
      return matchRepo && matchTime;
    });
  }

  public recordMaintenanceEvent(record: Omit<MaintenanceHistoryRecord, 'id'>): MaintenanceHistoryRecord {
    const item: MaintenanceHistoryRecord = {
      ...record,
      id: `mh_${crypto.randomUUID().slice(0, 8)}`,
    };
    this.data.maintenanceHistory.unshift(item);
    this.persist();
    return item;
  }

  public getPerformanceHistory(repoId?: string, days: number = 30): PerformanceHistoryRecord[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.data.performanceHistory.filter((p) => {
      const matchRepo = !repoId || p.repositoryId === repoId || p.repositoryId === 'repo_demo_01';
      const matchTime = new Date(p.timestamp).getTime() >= cutoff;
      return matchRepo && matchTime;
    });
  }

  public getChangeHotspots(repoId?: string): ChangeHotspot[] {
    return this.data.changeHotspots;
  }

  public savePredictionRun(record: PredictionRunRecord): void {
    const existingIdx = this.data.predictionRuns.findIndex((p) => p.id === record.id);
    if (existingIdx !== -1) {
      this.data.predictionRuns[existingIdx] = record;
    } else {
      this.data.predictionRuns.unshift(record);
    }

    if (record.report?.recommendations) {
      for (const rec of record.report.recommendations) {
        if (!this.data.preventiveRecommendations.some((r) => r.id === rec.id)) {
          this.data.preventiveRecommendations.unshift(rec);
        }
      }
    }

    this.persist();
  }

  public getPredictionRuns(repoId?: string): PredictionRunRecord[] {
    if (!repoId) return this.data.predictionRuns;
    return this.data.predictionRuns.filter((p) => p.repositoryId === repoId);
  }

  public getPredictionRunById(id: string): PredictionRunRecord | undefined {
    return this.data.predictionRuns.find((p) => p.id === id);
  }

  public getPreventiveRecommendations(repoId?: string): PreventiveRecommendation[] {
    return this.data.preventiveRecommendations;
  }

  public updateRecommendationStatus(id: string, status: RecommendationStatus): boolean {
    const rec = this.data.preventiveRecommendations.find((r) => r.id === id);
    if (!rec) return false;
    rec.status = status;

    // Also update in any reports containing this recommendation
    for (const run of this.data.predictionRuns) {
      if (run.report?.recommendations) {
        const item = run.report.recommendations.find((r) => r.id === id);
        if (item) item.status = status;
      }
    }

    this.persist();
    return true;
  }

  // --- Retention & Garbage Collection ---
  public cleanupExpiredWorkspaces(retentionHours: number = 24): number {
    const now = Date.now();
    const expiredCutoff = now - retentionHours * 60 * 60 * 1000;
    let cleaned = 0;

    const expired = this.data.repositories.filter((r) => {
      const created = new Date(r.createdAt).getTime();
      return created < expiredCutoff;
    });

    for (const r of expired) {
      this.deleteRepository(r.id);
      cleaned++;
    }

    return cleaned;
  }

  // --- Backup & Export ---
  public exportData() {
    return {
      version: this.data.version,
      exportedAt: new Date().toISOString(),
      stats: {
        totalUsers: this.data.users.length,
        totalSessions: this.data.sessions.length,
        totalRepositories: this.data.repositories.length,
        totalIssues: this.data.issues.length,
        totalPatches: this.data.patches.length,
        totalPredictionRuns: this.data.predictionRuns.length,
        totalPreventiveRecommendations: this.data.preventiveRecommendations.length,
      },
      sessions: this.data.sessions,
      repositories: this.data.repositories,
      issues: this.data.issues,
      patches: this.data.patches,
      predictionRuns: this.data.predictionRuns,
      recommendations: this.data.preventiveRecommendations,
      users: this.data.users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
      })),
    };
  }

  public close() {
    this.persist();
  }
}

export const db = new Database();
