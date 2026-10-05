import fs from 'fs';
import path from 'path';
import { db, RepositoryRecord } from '../database/db';
import { RepositoryScanner } from '../repository/repositoryScanner';

export interface RelevantFileContext {
  path: string;
  content: string;
  sizeBytes: number;
  relevanceScore: number;
  relevanceReason: string;
}

export interface ProjectContextSummary {
  repositoryId: string;
  name: string;
  languages: string[];
  frameworks: string[];
  testCommand?: string;
  entryPoints: string[];
  relevantFiles: RelevantFileContext[];
  structuralSummary: string;
}

export class ProjectContextEngine {
  private static readonly MAX_CONTEXT_FILES = 5;
  private static readonly MAX_FILE_CHARS = 10000;

  public static async buildContext(
    repo: RepositoryRecord,
    issueDescription: string,
    errorLogs?: string
  ): Promise<ProjectContextSummary> {
    const workspaceDir = repo.workspacePath;
    const metadata = await RepositoryScanner.scan(workspaceDir);

    const queryTerms = (issueDescription + ' ' + (errorLogs || ''))
      .toLowerCase()
      .split(/[^a-zA-Z0-9_\-]+/)
      .filter((w) => w.length > 2);

    const scoredFiles: RelevantFileContext[] = [];

    for (const relFile of metadata.files) {
      if (!RepositoryScanner.isSafeRelativePath(relFile)) continue;
      const fullPath = path.join(workspaceDir, relFile);

      let score = 0;
      let reason = '';
      const lowerPath = relFile.toLowerCase();

      // Path keyword matching
      for (const term of queryTerms) {
        if (lowerPath.includes(term)) {
          score += 5;
          reason = `Filename matches keyword '${term}'`;
        }
      }

      // Prioritize route, auth, api, controller, and test files
      if (lowerPath.includes('auth') || lowerPath.includes('login') || lowerPath.includes('user')) {
        score += 8;
        reason = reason || 'Matches core domain path';
      }
      if (lowerPath.includes('route') || lowerPath.includes('controller') || lowerPath.includes('service')) {
        score += 3;
      }
      if (lowerPath.includes('test')) {
        score += 4;
        reason = reason || 'Test suite for verification';
      }

      // Read small portion or full content if relevant
      if (score > 0 || metadata.files.length < 10) {
        try {
          const rawContent = fs.readFileSync(fullPath, 'utf8');
          const lowerContent = rawContent.toLowerCase();

          for (const term of queryTerms) {
            if (lowerContent.includes(term)) {
              score += 2;
            }
          }

          const truncated =
            rawContent.length > this.MAX_FILE_CHARS
              ? rawContent.slice(0, this.MAX_FILE_CHARS) + '\n... [truncated for context limit]'
              : rawContent;

          scoredFiles.push({
            path: relFile,
            content: truncated,
            sizeBytes: rawContent.length,
            relevanceScore: score,
            relevanceReason: reason || 'File structure & symbols',
          });
        } catch {
          // ignore unreadable
        }
      }
    }

    scoredFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);
    const topFiles = scoredFiles.slice(0, this.MAX_CONTEXT_FILES);

    const structuralSummary = `Repository: ${repo.name}
Languages: ${metadata.languages.join(', ') || 'N/A'}
Frameworks: ${metadata.frameworks.join(', ') || 'N/A'}
Total Files: ${metadata.totalFiles}
Identified Entry Points: ${metadata.entryPoints.join(', ') || 'None detected'}
Test Runner: ${metadata.testFramework || 'Custom / None'}
Discovered Test Command: ${metadata.testCommand || 'None'}`;

    return {
      repositoryId: repo.id,
      name: repo.name,
      languages: metadata.languages,
      frameworks: metadata.frameworks,
      testCommand: metadata.testCommand,
      entryPoints: metadata.entryPoints,
      relevantFiles: topFiles,
      structuralSummary,
    };
  }
}
