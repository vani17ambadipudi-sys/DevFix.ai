import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface RawExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: number;
  unsupported?: boolean;
  reason?: string;
}

const TIMEOUT_MS = 5000; // 5 seconds maximum execution time
const MAX_BUFFER = 512 * 1024; // 512 KB

export const codeExecutionTool = {
  isLanguageSupported(language: string): boolean {
    const lang = (language || '').trim().toLowerCase();
    return ['python', 'javascript', 'typescript'].includes(lang);
  },

  async executeCode(code: string, language: string): Promise<RawExecutionResult> {
    const lang = (language || '').trim().toLowerCase();

    if (!this.isLanguageSupported(lang)) {
      return {
        success: false,
        stdout: '',
        stderr: 'Static analysis only. Execution unavailable for this language/environment.',
        exitCode: 1,
        executionTime: 0,
        unsupported: true,
        reason: 'Execution unavailable for this language/environment.',
      };
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devfix-exec-'));
    let tempFile = '';
    let command = '';
    let args: string[] = [];

    try {
      if (lang === 'python') {
        tempFile = path.join(tempDir, 'script.py');
        fs.writeFileSync(tempFile, code, 'utf8');
        command = 'python3';
        args = [tempFile];
      } else if (lang === 'javascript') {
        tempFile = path.join(tempDir, 'script.mjs');
        fs.writeFileSync(tempFile, code, 'utf8');
        command = 'node';
        args = [tempFile];
      } else if (lang === 'typescript') {
        tempFile = path.join(tempDir, 'script.ts');
        fs.writeFileSync(tempFile, code, 'utf8');
        // Run using tsx from node_modules or system
        const localTsx = path.resolve(process.cwd(), 'node_modules/.bin/tsx');
        if (fs.existsSync(localTsx)) {
          command = localTsx;
          args = [tempFile];
        } else {
          command = 'npx';
          args = ['tsx', tempFile];
        }
      }

      const startTime = Date.now();

      return await new Promise<RawExecutionResult>((resolve) => {
        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const child = spawn(command, args, {
          cwd: tempDir,
          env: {
            ...process.env,
            // Prevent python from buffering stdout
            PYTHONUNBUFFERED: '1',
            NODE_ENV: 'test',
          },
          timeout: TIMEOUT_MS,
        });

        const timer = setTimeout(() => {
          timedOut = true;
          try {
            child.kill('SIGKILL');
          } catch {
            // ignore
          }
        }, TIMEOUT_MS);

        child.stdout?.on('data', (chunk) => {
          if (stdout.length < MAX_BUFFER) {
            stdout += chunk.toString();
          }
        });

        child.stderr?.on('data', (chunk) => {
          if (stderr.length < MAX_BUFFER) {
            stderr += chunk.toString();
          }
        });

        child.on('error', (err) => {
          clearTimeout(timer);
          const executionTime = Date.now() - startTime;
          resolve({
            success: false,
            stdout,
            stderr: (stderr ? stderr + '\n' : '') + `Execution process error: ${err.message}`,
            exitCode: 1,
            executionTime,
          });
        });

        child.on('close', (code, signal) => {
          clearTimeout(timer);
          const executionTime = Date.now() - startTime;
          const exitCode = timedOut ? 124 : (code ?? (signal ? 1 : 0));

          if (timedOut) {
            stderr = (stderr ? stderr + '\n' : '') + `Execution timed out after ${TIMEOUT_MS / 1000}s.`;
          }

          const isSuccess = exitCode === 0 && !timedOut && (!stderr || !stderr.toLowerCase().includes('traceback'));

          resolve({
            success: isSuccess,
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode,
            executionTime,
          });
        });
      });
    } catch (e: any) {
      return {
        success: false,
        stdout: '',
        stderr: `Failed to execute code: ${e?.message || String(e)}`,
        exitCode: 1,
        executionTime: 0,
      };
    } finally {
      // Clean up temp directory safely
      try {
        if (tempFile && fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      } catch {
        // ignore cleanup errors
      }
    }
  },
};
