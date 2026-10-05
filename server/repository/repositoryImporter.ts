import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { db, RepositoryRecord } from '../database/db';
import { RepositoryScanner } from './repositoryScanner';
import { logger } from '../observability/logger';

export class RepositoryImporter {
  private static readonly MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50MB
  private static readonly MAX_FILES = 1500;

  /**
   * Imports a repository from a ZIP buffer with strict zip-slip protection
   * and isolated read-only source setup.
   */
  public static async importFromZip(
    zipBuffer: Buffer,
    repoName: string = 'imported-repo',
    userId?: string
  ): Promise<RepositoryRecord> {
    if (zipBuffer.length > this.MAX_ZIP_BYTES) {
      throw new Error(`ZIP file exceeds size limit of ${this.MAX_ZIP_BYTES / (1024 * 1024)}MB`);
    }

    const safeRepoId = `repo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const baseDir = path.resolve(process.cwd(), 'data', 'workspaces', safeRepoId);
    const sourceDir = path.join(baseDir, 'source');
    const workspaceDir = path.join(baseDir, 'workspace');

    fs.mkdirSync(sourceDir, { recursive: true, mode: 0o755 });
    fs.mkdirSync(workspaceDir, { recursive: true, mode: 0o755 });

    const zip = new AdmZip(zipBuffer);
    const zipEntries = zip.getEntries();

    if (zipEntries.length > this.MAX_FILES) {
      throw new Error(`ZIP contains ${zipEntries.length} files, exceeding limit of ${this.MAX_FILES}`);
    }

    const resolvedSource = path.resolve(sourceDir);

    for (const entry of zipEntries) {
      if (entry.isDirectory) continue;

      // Zip-Slip Security Check: ensure resolved path strictly begins inside resolvedSource
      const targetFilePath = path.resolve(sourceDir, entry.entryName);
      if (!targetFilePath.startsWith(resolvedSource + path.sep)) {
        throw new Error(`Security Violation: Zip-slip detected in entry path '${entry.entryName}'`);
      }

      // Skip sensitive files
      const baseName = path.basename(entry.entryName);
      if (baseName.startsWith('.env') || baseName === 'id_rsa' || baseName.endsWith('.key')) {
        continue;
      }

      const targetDir = path.dirname(targetFilePath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      fs.writeFileSync(targetFilePath, entry.getData(), { mode: 0o644 });
    }

    // Copy to isolated workspace for active testing & patching
    this.copyDirectoryRecursive(sourceDir, workspaceDir);

    // Scan metadata
    const metadata = await RepositoryScanner.scan(workspaceDir);

    const record = db.saveRepository({
      userId,
      name: repoName.replace(/[^a-zA-Z0-9_\-\.]/g, '_'),
      originalPath: sourceDir,
      workspacePath: workspaceDir,
      languages: metadata.languages,
      frameworks: metadata.frameworks,
      packageManager: metadata.packageManager,
      testFramework: metadata.testFramework,
      entryPoints: metadata.entryPoints,
      filesCount: metadata.totalFiles,
      status: 'ready',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    logger.info('repository_imported', 'repo_import', {
      repoId: record.id,
      name: record.name,
      filesCount: record.filesCount,
      languages: record.languages,
    });

    return record;
  }

  /**
   * Imports from an existing local folder (e.g. bundled demo repositories).
   */
  public static async importFromLocalFolder(
    localFolderPath: string,
    repoName: string,
    userId?: string
  ): Promise<RepositoryRecord> {
    const resolvedSource = path.resolve(localFolderPath);
    if (!fs.existsSync(resolvedSource)) {
      throw new Error(`Local source folder not found: ${localFolderPath}`);
    }

    const safeRepoId = `repo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const baseDir = path.resolve(process.cwd(), 'data', 'workspaces', safeRepoId);
    const sourceDir = path.join(baseDir, 'source');
    const workspaceDir = path.join(baseDir, 'workspace');

    fs.mkdirSync(sourceDir, { recursive: true, mode: 0o755 });
    fs.mkdirSync(workspaceDir, { recursive: true, mode: 0o755 });

    this.copyDirectoryRecursive(resolvedSource, sourceDir);
    this.copyDirectoryRecursive(sourceDir, workspaceDir);

    const metadata = await RepositoryScanner.scan(workspaceDir);

    const record = db.saveRepository({
      userId,
      name: repoName,
      originalPath: sourceDir,
      workspacePath: workspaceDir,
      languages: metadata.languages,
      frameworks: metadata.frameworks,
      packageManager: metadata.packageManager,
      testFramework: metadata.testFramework,
      entryPoints: metadata.entryPoints,
      filesCount: metadata.totalFiles,
      status: 'ready',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    return record;
  }

  public static copyDirectoryRecursive(src: string, dest: string) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.env')) {
        continue;
      }
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectoryRecursive(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
