import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { db } from '../database/db';
import { RepositoryScanner } from '../repository/repositoryScanner';
import { RepositoryImporter } from '../repository/repositoryImporter';
import { DemoRepositorySeed } from '../data/demoRepository';
import { WorkspaceManager } from '../workspace/workspaceManager';
import { RepositoryOrchestrator } from '../../src/agents/repository/repositoryOrchestrator';
import { config } from '../config/env';
import { GoogleGenAI } from '@google/genai';
import { logger } from '../observability/logger';
import { rateLimiters } from '../middleware/rateLimiter';

const router = Router();

function getGeminiClient(): GoogleGenAI | null {
  if (!config.hasGeminiKey) return null;
  return new GoogleGenAI({
    apiKey: config.geminiApiKey,
    httpOptions: { headers: { 'User-Agent': 'devfix-repo-engineering' } },
  });
}

// 1. List Repositories
router.get('/', (req: Request, res: Response) => {
  const repos = db.getRepositories(req.userId);
  res.json({ success: true, data: repos });
});

// 2. Seed / Load Canonical Section 38 Demo Repository
router.post('/seed-demo', async (req: Request, res: Response) => {
  try {
    const repo = await DemoRepositorySeed.ensureDemoRepository();
    res.json({ success: true, data: repo });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Import Repository from ZIP (Base64 payload)
router.post('/import-zip', rateLimiters.general, async (req: Request, res: Response) => {
  try {
    const { zipBase64, name = 'uploaded-repo' } = req.body;
    if (!zipBase64 || typeof zipBase64 !== 'string') {
      return res.status(400).json({ success: false, error: 'zipBase64 field is required.' });
    }

    const zipBuffer = Buffer.from(zipBase64, 'base64');
    const repo = await RepositoryImporter.importFromZip(zipBuffer, name, req.userId);
    res.status(201).json({ success: true, data: repo });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. Get Repository Details
router.get('/:id', (req: Request, res: Response) => {
  const repo = db.getRepositoryById(req.params.id);
  if (!repo) {
    return res.status(404).json({ success: false, error: 'Repository not found.' });
  }
  res.json({ success: true, data: repo });
});

// 5. Get File Tree for Repository
router.get('/:id/files', async (req: Request, res: Response) => {
  const repo = db.getRepositoryById(req.params.id);
  if (!repo) {
    return res.status(404).json({ success: false, error: 'Repository not found.' });
  }
  try {
    const metadata = await RepositoryScanner.scan(repo.workspacePath);
    res.json({
      success: true,
      data: {
        files: metadata.files,
        directories: metadata.directories,
        totalFiles: metadata.totalFiles,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Safe Read File Content from Workspace
router.get('/:id/file', (req: Request, res: Response) => {
  const repo = db.getRepositoryById(req.params.id);
  if (!repo) {
    return res.status(404).json({ success: false, error: 'Repository not found.' });
  }

  const filePath = req.query.path as string;
  if (!filePath || !RepositoryScanner.isSafeRelativePath(filePath)) {
    return res.status(400).json({ success: false, error: 'Invalid or forbidden file path.' });
  }

  const resolved = path.resolve(repo.workspacePath, filePath);
  if (!resolved.startsWith(path.resolve(repo.workspacePath) + path.sep)) {
    return res.status(403).json({ success: false, error: 'Path escapes workspace boundaries.' });
  }

  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ success: false, error: 'File not found.' });
  }

  try {
    const content = fs.readFileSync(resolved, 'utf8');
    res.json({
      success: true,
      data: {
        path: filePath,
        content,
        sizeBytes: Buffer.byteLength(content, 'utf8'),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Full Autonomous Diagnosis Pipeline (Streaming SSE)
router.post('/:id/diagnose-stream', rateLimiters.ai, async (req: Request, res: Response) => {
  const repo = db.getRepositoryById(req.params.id);
  if (!repo) {
    return res.status(404).json({ success: false, error: 'Repository not found.' });
  }

  const { issueDescription, errorLogs } = req.body;
  if (!issueDescription || typeof issueDescription !== 'string') {
    return res.status(400).json({ success: false, error: 'issueDescription is required.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const ai = getGeminiClient();
    const result = await RepositoryOrchestrator.executeDiagnosis(
      repo,
      issueDescription,
      errorLogs,
      ai,
      (progressEvent) => {
        sendEvent({ type: 'progress', event: progressEvent });
      },
      req.id || `repo_diag_${Date.now()}`
    );

    sendEvent({ type: 'result', data: result });
    res.end();
  } catch (err: any) {
    logger.error('diagnose_stream_failed', req.id || 'repo_diag', 'ORCHESTRATOR_ERROR', err.message);
    sendEvent({ type: 'error', error: err.message });
    res.end();
  }
});

// 8. Developer Approval: Apply Patch to Source
router.post('/issues/:id/approve', (req: Request, res: Response) => {
  const issue = db.getIssueById(req.params.id);
  if (!issue) {
    return res.status(404).json({ success: false, error: 'Issue not found.' });
  }

  const patches = db.getPatchesByIssue(issue.id);
  const patch = patches[0];
  if (!patch) {
    return res.status(404).json({ success: false, error: 'No patch found for this issue.' });
  }

  // Mark patch as approved
  db.updatePatch(patch.id, { status: 'approved' });
  db.updateIssue(issue.id, { status: 'resolved' });

  // Apply to source folder
  try {
    const applied = WorkspaceManager.applyApprovedPatchToSource(issue.repositoryId, patch.id);
    return res.json({
      success: true,
      message: 'Patch approved by developer and successfully applied to source repository.',
      data: applied,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Developer Rejection: Reject & Discard Patch
router.post('/issues/:id/reject', (req: Request, res: Response) => {
  const issue = db.getIssueById(req.params.id);
  if (!issue) {
    return res.status(404).json({ success: false, error: 'Issue not found.' });
  }

  const { reason = 'Rejected by developer' } = req.body;
  const patches = db.getPatchesByIssue(issue.id);
  const patch = patches[0];

  if (patch) {
    db.updatePatch(patch.id, {
      status: 'rejected',
      rejectionReason: reason,
    });
  }

  // Rollback workspace to pre-patch state
  WorkspaceManager.rollback(issue.repositoryId);
  db.updateIssue(issue.id, { status: 'open' });

  return res.json({
    success: true,
    message: 'Patch rejected. Workspace rolled back to original state.',
  });
});

// 10. Rollback Workspace
router.post('/issues/:id/rollback', (req: Request, res: Response) => {
  const issue = db.getIssueById(req.params.id);
  if (!issue) {
    return res.status(404).json({ success: false, error: 'Issue not found.' });
  }

  const rolledBack = WorkspaceManager.rollback(issue.repositoryId);
  if (rolledBack) {
    return res.json({ success: true, message: 'Workspace rolled back to previous checkpoint.' });
  } else {
    return res.status(500).json({ success: false, error: 'Could not roll back workspace.' });
  }
});

// 11. Delete Repository & Clean Workspace
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = db.deleteRepository(req.params.id);
  if (deleted) {
    res.json({ success: true, message: 'Repository and workspace data deleted cleanly.' });
  } else {
    res.status(404).json({ success: false, error: 'Repository not found.' });
  }
});

export default router;
