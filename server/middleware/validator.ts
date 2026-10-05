import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import { logger } from '../observability/logger';
import { metrics } from '../observability/metrics';

const ALLOWED_LANGUAGES = new Set([
  'python',
  'javascript',
  'typescript',
  'sql',
  'java',
  'cpp',
  'csharp',
  'go',
  'rust',
]);

const ALLOWED_MCP_TOOLS = new Set([
  'run_code',
  'read_project_file',
  'inspect_project',
  'search_documentation',
  'search_project',
  'run_tests',
  'apply_patch',
  'generate_diff',
  'git_status',
  'git_diff',
]);

export function validateDebugRequest(req: Request, res: Response, next: NextFunction) {
  const { language, code } = req.body;

  if (!code || typeof code !== 'string' || !code.trim()) {
    const msg = 'Code field is required and cannot be empty.';
    metrics.recordError(req.id || 'val_req', 'VALIDATION_ERROR', 'VALIDATOR', msg);
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: msg },
    });
  }

  const codeBytes = Buffer.byteLength(code, 'utf8');
  if (codeBytes > config.executionLimits.maxCodeSizeBytes) {
    const msg = `Code size (${codeBytes} bytes) exceeds maximum allowable limit of ${config.executionLimits.maxCodeSizeBytes} bytes.`;
    metrics.recordError(req.id || 'val_req', 'VALIDATION_ERROR', 'VALIDATOR', msg);
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: msg },
    });
  }

  if (language && typeof language === 'string') {
    const normalized = language.toLowerCase().trim();
    if (!ALLOWED_LANGUAGES.has(normalized)) {
      const msg = `Unsupported language: '${language}'. Supported languages: ${Array.from(ALLOWED_LANGUAGES).join(', ')}`;
      metrics.recordError(req.id || 'val_req', 'VALIDATION_ERROR', 'VALIDATOR', msg);
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: msg },
      });
    }
  }

  next();
}

export function validateMcpCall(req: Request, res: Response, next: NextFunction) {
  const { tool, arguments: args } = req.body;

  if (!tool || typeof tool !== 'string' || !ALLOWED_MCP_TOOLS.has(tool)) {
    const msg = `Invalid or unknown MCP tool '${tool}'. Available tools: ${Array.from(ALLOWED_MCP_TOOLS).join(', ')}`;
    metrics.recordError(req.id || 'val_req', 'VALIDATION_ERROR', 'MCP_VALIDATOR', msg);
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: msg },
    });
  }

  if (args && typeof args !== 'object') {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'MCP tool arguments must be an object.' },
    });
  }

  // Path validation for file reading tools
  if (tool === 'read_project_file' || tool === 'inspect_project') {
    const targetPath = args?.path || args?.subDirectory || '';
    if (typeof targetPath === 'string') {
      if (
        targetPath.includes('..') ||
        targetPath.startsWith('/') ||
        targetPath.includes('.env') ||
        targetPath.includes('id_rsa') ||
        targetPath.includes('passwd')
      ) {
        const msg = `Access denied: Path traversal or protected file path '${targetPath}' is forbidden.`;
        metrics.recordError(req.id || 'val_req', 'MCP_ERROR', 'MCP_SECURITY', msg);
        logger.warn('mcp_security_violation', req.id || 'no_req', msg);
        return res.status(403).json({
          success: false,
          error: { code: 'MCP_ERROR', message: msg },
        });
      }
    }
  }

  next();
}

export function validateAuthRequest(req: Request, res: Response, next: NextFunction) {
  const { email, password } = req.body;

  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Valid email address is required.' },
    });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters long.' },
    });
  }

  next();
}
