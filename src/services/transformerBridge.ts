import { execFile, spawn } from 'child_process';
import path from 'path';

import fs from 'fs';

const LAB_DIR = path.resolve(process.cwd(), 'transformer-lab');
const BRIDGE_SCRIPT = path.join(LAB_DIR, 'api_bridge.py');

function getPythonExecutable(): string {
  if (fs.existsSync('/opt/venv/bin/python3')) {
    return '/opt/venv/bin/python3';
  }
  return 'python3';
}

export interface TransformerStatus {
  status: string;
  pytorch_version: string;
  device: string;
  cuda_available: boolean;
  checkpoint_exists: boolean;
  vocab_exists: boolean;
  vocab_size: number;
  history?: any;
  default_config: {
    d_model: number;
    num_heads: number;
    num_layers: number;
    d_ff: number;
    max_seq_len: number;
  };
}

export function runTransformerBridgeCommand(args: string[]): Promise<any> {
  const pythonBin = getPythonExecutable();
  return new Promise((resolve, reject) => {
    execFile(
      pythonBin,
      [BRIDGE_SCRIPT, ...args],
      { cwd: LAB_DIR, maxBuffer: 10 * 1024 * 1024, timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) {
          console.warn('[Transformer Bridge Notice]:', stderr || error.message);
          if (args[0] === 'status') {
            return resolve({
              status: 'fallback_active',
              pytorch_version: 'Not Installed (Algorithmic Simulation)',
              device: 'CPU (Simulation)',
              cuda_available: false,
              checkpoint_exists: false,
              vocab_exists: true,
              vocab_size: 286,
              history: null,
              warning: 'PyTorch is not installed in the local environment. Transformer Lab is operating in algorithmic simulation mode.',
              default_config: {
                d_model: 128,
                num_heads: 4,
                num_layers: 2,
                d_ff: 512,
                max_seq_len: 64,
              },
            });
          }
          return reject(new Error(stderr || error.message));
        }

        try {
          const parsed = JSON.parse(stdout.trim());
          if (parsed.error && parsed.success === false) {
            return reject(new Error(parsed.error));
          }
          resolve(parsed);
        } catch (err: any) {
          reject(new Error(`Failed to parse bridge JSON: ${stdout.slice(0, 200)}`));
        }
      }
    );
  });
}

export function streamTransformerTraining(
  params: { epochs: number; lr: number; d_model: number; heads: number; layers: number },
  onProgress: (data: any) => void
): Promise<any> {
  const pythonBin = getPythonExecutable();
  return new Promise((resolve, reject) => {
    const child = spawn(
      pythonBin,
      [
        BRIDGE_SCRIPT,
        'train',
        '--epochs',
        String(params.epochs || 15),
        '--lr',
        String(params.lr || 1e-3),
        '--d-model',
        String(params.d_model || 128),
        '--heads',
        String(params.heads || 4),
        '--layers',
        String(params.layers || 2),
      ],
      { cwd: LAB_DIR }
    );

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrData += text;

      // Check for PROGRESS lines
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('PROGRESS:')) {
          try {
            const info = JSON.parse(line.replace('PROGRESS:', ''));
            onProgress(info);
          } catch {
            // ignore
          }
        }
      }
    });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(stderrData || `Training process exited with code ${code}`));
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        resolve(parsed);
      } catch (err) {
        resolve({ success: true, message: 'Training completed' });
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}
