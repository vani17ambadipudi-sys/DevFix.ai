import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { config } from '../config/env';
import { logger } from '../observability/logger';
import { metrics } from '../observability/metrics';

export interface SandboxExecutionResult {
  attempted: boolean;
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  timedOut?: boolean;
  error?: string;
}

const SUPPORTED_LANGUAGES: Record<string, { cmd: string; ext: string; getArgs: (filePath: string) => string[] }> = {
  python: {
    cmd: 'python3',
    ext: '.py',
    getArgs: (fp) => ['-u', fp],
  },
  javascript: {
    cmd: 'node',
    ext: '.js',
    getArgs: (fp) => [fp],
  },
  typescript: {
    cmd: 'tsx',
    ext: '.ts',
    getArgs: (fp) => [fp],
  },
};

export class SecureSandbox {
  /**
   * Executes user code in a strictly isolated temporary sandbox directory
   * with resource timeouts, output truncating, and sanitized environment variables.
   */
  public static async execute(
    language: string,
    code: string,
    requestId: string = 'sandbox_req'
  ): Promise<SandboxExecutionResult> {
    const startTime = Date.now();
    const langKey = language.toLowerCase().trim();

    // 1. Language Allowlist Check
    const langConfig = SUPPORTED_LANGUAGES[langKey];
    if (!langConfig) {
      const err = `Execution not supported for language: '${language}'. Supported: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`;
      logger.warn('sandbox_rejected_language', requestId, err);
      return {
        attempted: false,
        success: false,
        stdout: '',
        stderr: err,
        exitCode: 1,
        executionTime: 0,
        error: err,
      };
    }

    // 2. Maximum Code Size Validation
    const codeBytes = Buffer.byteLength(code, 'utf8');
    if (codeBytes > config.executionLimits.maxCodeSizeBytes) {
      const err = `Code size (${codeBytes} bytes) exceeds safety limit of ${config.executionLimits.maxCodeSizeBytes} bytes.`;
      logger.warn('sandbox_code_size_exceeded', requestId, err);
      return {
        attempted: false,
        success: false,
        stdout: '',
        stderr: err,
        exitCode: 1,
        executionTime: 0,
        error: err,
      };
    }

    // 3. Create isolated scratch directory inside OS temp
    const sandboxId = crypto.randomUUID();
    const sandboxDir = path.join(os.tmpdir(), `devfix_sandbox_${sandboxId}`);
    const scriptPath = path.join(sandboxDir, `main${langConfig.ext}`);

    try {
      await fs.promises.mkdir(sandboxDir, { recursive: true, mode: 0o700 });
      await fs.promises.writeFile(scriptPath, code, { encoding: 'utf8', mode: 0o600 });

      // 4. Sanitize environment: NEVER pass server secrets, API keys, or JWT tokens to user scripts!
      const sanitizedEnv: NodeJS.ProcessEnv = {
        PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
        NODE_ENV: 'sandbox',
        TMPDIR: sandboxDir,
        HOME: sandboxDir,
        PYTHONUNBUFFERED: '1',
      };

      const timeoutMs = config.executionLimits.executionTimeoutMs;

      // 5. Spawn child process
      return await new Promise<SandboxExecutionResult>((resolve) => {
        let stdout = '';
        let stderr = '';
        let killed = false;

        const child = spawn(langConfig.cmd, langConfig.getArgs(scriptPath), {
          cwd: sandboxDir,
          env: sanitizedEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        // Close stdin immediately
        child.stdin?.end();

        // Enforce execution timeout
        const timer = setTimeout(() => {
          killed = true;
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore
          }
        }, timeoutMs);

        child.stdout.on('data', (chunk) => {
          if (stdout.length < config.executionLimits.maxOutputLengthChars) {
            stdout += chunk.toString();
          } else if (!stdout.endsWith('\n[Output truncated at safety limit]')) {
            stdout += '\n[Output truncated at safety limit]';
          }
        });

        child.stderr.on('data', (chunk) => {
          if (stderr.length < config.executionLimits.maxOutputLengthChars) {
            stderr += chunk.toString();
          } else if (!stderr.endsWith('\n[Stderr truncated at safety limit]')) {
            stderr += '\n[Stderr truncated at safety limit]';
          }
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          const duration = Date.now() - startTime;

          metrics.recordMcpCall('run_code', duration, !killed && code === 0);

          if (killed) {
            const timeoutMsg = `Execution timed out after ${timeoutMs}ms limit. Process terminated.`;
            metrics.recordError(requestId, 'EXECUTION_TIMEOUT', 'SANDBOX', timeoutMsg);
            logger.warn('sandbox_timeout', requestId, timeoutMsg, { durationMs: duration });
            return resolve({
              attempted: true,
              success: false,
              stdout,
              stderr: `${stderr}\n${timeoutMsg}`.trim(),
              exitCode: -1,
              executionTime: duration,
              timedOut: true,
              error: 'EXECUTION_TIMEOUT',
            });
          }

          const success = code === 0;
          resolve({
            attempted: true,
            success,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code,
            executionTime: duration,
          });
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          const duration = Date.now() - startTime;
          const msg = `Failed to spawn process for ${language}: ${err.message}`;
          metrics.recordError(requestId, 'EXECUTION_ERROR', 'SANDBOX', msg);
          logger.error('sandbox_spawn_error', requestId, 'EXECUTION_ERROR', msg, 'SANDBOX', duration);
          resolve({
            attempted: true,
            success: false,
            stdout,
            stderr: msg,
            exitCode: 1,
            executionTime: duration,
            error: err.message,
          });
        });
      });
    } catch (err: any) {
      const duration = Date.now() - startTime;
      logger.error('sandbox_fs_error', requestId, 'EXECUTION_ERROR', err.message, 'SANDBOX', duration);
      return {
        attempted: false,
        success: false,
        stdout: '',
        stderr: `Sandbox initialization error: ${err.message}`,
        exitCode: 1,
        executionTime: duration,
        error: err.message,
      };
    } finally {
      // 6. Clean up temporary sandbox directory safely
      fs.rm(sandboxDir, { recursive: true, force: true }, () => {});
    }
  }
}
