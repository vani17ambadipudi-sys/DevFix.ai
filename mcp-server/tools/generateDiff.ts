import fs from 'fs';
import path from 'path';
import {
  MCPToolDefinition,
  GenerateDiffArgs,
  GenerateDiffResult,
  FileDiff,
} from '../types';

export const generateDiffDefinition: MCPToolDefinition = {
  name: 'generate_diff',
  description:
    'Generates unified diff representation comparing files in workspace against the original repository source.',
  inputSchema: {
    type: 'object',
    properties: {
      workspacePath: {
        type: 'string',
        description: 'The root directory of the workspace with proposed changes.',
      },
      originalPath: {
        type: 'string',
        description: 'The root directory of the original unaltered repository.',
      },
      files: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of specific files to compare.',
      },
    },
    required: ['workspacePath', 'originalPath'],
  },
};

export async function executeGenerateDiff(args: GenerateDiffArgs): Promise<GenerateDiffResult> {
  const { workspacePath, originalPath, files } = args;

  const resolvedWork = path.resolve(workspacePath);
  const resolvedOrig = path.resolve(originalPath);

  const targetFiles: string[] = files && files.length > 0 ? files : getFilesToCompare(resolvedWork);

  const diffs: FileDiff[] = [];
  const combinedDiffLines: string[] = [];

  for (const relFile of targetFiles) {
    const origFile = path.join(resolvedOrig, relFile);
    const workFile = path.join(resolvedWork, relFile);

    const origContent = fs.existsSync(origFile) ? fs.readFileSync(origFile, 'utf8') : '';
    const workContent = fs.existsSync(workFile) ? fs.readFileSync(workFile, 'utf8') : '';

    if (origContent === workContent) continue;

    const fileDiff = createUnifiedDiff(relFile, origContent, workContent);
    diffs.push(fileDiff);
    combinedDiffLines.push(fileDiff.unifiedDiff);
  }

  return {
    totalChangedFiles: diffs.length,
    diffs,
    combinedDiff: combinedDiffLines.join('\n\n'),
  };
}

function getFilesToCompare(dir: string, baseDir: string = dir): string[] {
  const result: string[] = [];
  if (!fs.existsSync(dir)) return result;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...getFilesToCompare(full, baseDir));
    } else {
      result.push(path.relative(baseDir, full));
    }
  }
  return result;
}

export function createUnifiedDiff(filename: string, oldText: string, newText: string): FileDiff {
  const oldLines = oldText ? oldText.split('\n') : [];
  const newLines = newText ? newText.split('\n') : [];

  let additions = 0;
  let deletions = 0;
  const diffLines: string[] = [
    `--- a/${filename}`,
    `+++ b/${filename}`,
    `@@ -1,${Math.max(1, oldLines.length)} +1,${Math.max(1, newLines.length)} @@`,
  ];

  // Simple line-by-line diff representation
  let i = 0;
  let j = 0;

  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      diffLines.push(` ${oldLines[i]}`);
      i++;
      j++;
    } else if (j < newLines.length && (i >= oldLines.length || !oldLines.includes(newLines[j]))) {
      diffLines.push(`+${newLines[j]}`);
      additions++;
      j++;
    } else if (i < oldLines.length) {
      diffLines.push(`-${oldLines[i]}`);
      deletions++;
      i++;
    } else {
      j++;
    }
  }

  return {
    file: filename,
    unifiedDiff: diffLines.join('\n'),
    additions,
    deletions,
  };
}
