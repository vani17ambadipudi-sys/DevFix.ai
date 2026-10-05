import fs from 'fs';
import path from 'path';
import {
  MCPToolDefinition,
  ApplyPatchArgs,
  ApplyPatchResult,
} from '../types';
import { RepositoryScanner } from '../../server/repository/repositoryScanner';

export const applyPatchDefinition: MCPToolDefinition = {
  name: 'apply_patch',
  description:
    'Applies a verified code modification to a file within the isolated workspace with path traversal protection.',
  inputSchema: {
    type: 'object',
    properties: {
      workspacePath: {
        type: 'string',
        description: 'The root directory of the workspace where the file resides.',
      },
      file: {
        type: 'string',
        description: 'Relative path of the target file to modify.',
      },
      patch: {
        type: 'string',
        description: 'New code content or patch hunk to write to the file.',
      },
      operation: {
        type: 'string',
        enum: ['modify', 'create', 'delete'],
        description: 'Operation type to execute.',
      },
    },
    required: ['workspacePath', 'file', 'patch'],
  },
};

export async function executeApplyPatch(args: ApplyPatchArgs): Promise<ApplyPatchResult> {
  const { workspacePath, file, patch, operation = 'modify' } = args;

  if (!workspacePath || !file || patch === undefined) {
    throw new Error('workspacePath, file, and patch arguments are required.');
  }

  // 1. Path Traversal & Security Validation
  if (!RepositoryScanner.isSafeRelativePath(file)) {
    throw new Error(`Security Violation: Target file path '${file}' is forbidden (path traversal or protected file).`);
  }

  const resolvedRoot = path.resolve(workspacePath);
  const targetPath = path.resolve(resolvedRoot, file);

  if (!targetPath.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Security Violation: Target path '${targetPath}' escapes workspace boundary.`);
  }

  if (operation === 'delete') {
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    return {
      success: true,
      file,
      operation: 'delete',
      message: `File ${file} deleted successfully.`,
    };
  }

  // Ensure parent directory exists
  const parentDir = path.dirname(targetPath);
  if (!fs.existsSync(parentDir)) {
    fs.mkdirSync(parentDir, { recursive: true });
  }

  // Write content
  fs.writeFileSync(targetPath, patch, 'utf8');
  const bytesWritten = Buffer.byteLength(patch, 'utf8');

  return {
    success: true,
    file,
    operation,
    bytesWritten,
    message: `Successfully applied ${operation} to ${file} (${bytesWritten} bytes).`,
  };
}
