import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, RepositoryRecord, CheckpointRecord } from '../database/db';
import { RepositoryScanner } from '../repository/repositoryScanner';
import { logger } from '../observability/logger';

export class WorkspaceManager {
  /**
   * Creates a snapshot checkpoint before any file modification.
   */
  public static createCheckpoint(repoId: string, label: string = 'Pre-patch Checkpoint'): CheckpointRecord {
    const repo = db.getRepositoryById(repoId);
    if (!repo) throw new Error(`Repository ${repoId} not found`);

    const cpId = `cp_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const baseDir = path.dirname(repo.workspacePath);
    const backupDir = path.join(baseDir, 'checkpoints', cpId);

    fs.mkdirSync(backupDir, { recursive: true });
    this.copyDirSync(repo.workspacePath, backupDir);

    const record = db.saveCheckpoint({
      repositoryId: repoId,
      backupPath: backupDir,
      label,
    });

    logger.info('checkpoint_created', 'workspace_checkpoint', { repoId, checkpointId: record.id, label });
    return record;
  }

  /**
   * Rolls back the workspace to a specified checkpoint.
   */
  public static rollback(repoId: string, checkpointId?: string): boolean {
    const repo = db.getRepositoryById(repoId);
    if (!repo) return false;

    let targetCheckpoint: CheckpointRecord | undefined;
    if (checkpointId) {
      targetCheckpoint = db.getCheckpointById(checkpointId);
    } else {
      const cps = db.getCheckpointsByRepo(repoId);
      targetCheckpoint = cps[0];
    }

    if (!targetCheckpoint || !fs.existsSync(targetCheckpoint.backupPath)) {
      // Fallback: reset from original source
      if (fs.existsSync(repo.originalPath)) {
        this.wipeAndRestore(repo.originalPath, repo.workspacePath);
        logger.info('workspace_reset_from_source', 'rollback', { repoId });
        return true;
      }
      return false;
    }

    this.wipeAndRestore(targetCheckpoint.backupPath, repo.workspacePath);
    logger.info('workspace_rolled_back', 'rollback', { repoId, checkpointId: targetCheckpoint.id });
    return true;
  }

  /**
   * Applies approved changes to original source ONLY after explicit developer approval.
   */
  public static applyApprovedPatchToSource(repoId: string, patchId: string): { success: boolean; changedFiles: string[] } {
    const repo = db.getRepositoryById(repoId);
    const patch = db.getPatchById(patchId);

    if (!repo || !patch) {
      throw new Error('Repository or Patch record not found');
    }

    if (patch.status !== 'approved') {
      throw new Error(`Security Violation: Patch ${patchId} is not approved by the developer (status: ${patch.status}). Cannot apply to source.`);
    }

    const appliedFiles: string[] = [];

    for (const relFile of patch.changedFiles) {
      if (!RepositoryScanner.isSafeRelativePath(relFile)) {
        throw new Error(`Forbidden file path in approved patch: ${relFile}`);
      }

      const workspaceFile = path.join(repo.workspacePath, relFile);
      const sourceFile = path.join(repo.originalPath, relFile);

      if (fs.existsSync(workspaceFile)) {
        const destDir = path.dirname(sourceFile);
        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(workspaceFile, sourceFile);
        appliedFiles.push(relFile);
      }
    }

    logger.info('patch_applied_to_source', 'approval_apply', { repoId, patchId, appliedFiles });
    return { success: true, changedFiles: appliedFiles };
  }

  private static wipeAndRestore(source: string, target: string) {
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
    }
    fs.mkdirSync(target, { recursive: true });
    this.copyDirSync(source, target);
  }

  private static copyDirSync(src: string, dest: string) {
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyDirSync(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
