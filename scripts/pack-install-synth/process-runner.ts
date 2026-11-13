import { spawn }               from 'node:child_process';

import type { ProcessOptions } from './process-options';
import type { ProcessResult }  from './process-result';

/**
 * Runs a child process without a shell and collects both of its streams. Rejects only when the
 * process cannot be started; a process that runs and fails resolves with its exit code.
 */
export class ProcessRunner {
  /** Resolves with exit code 1 when the process was killed by a signal, since it then has no exit code. */
  public run(command: string, args: readonly string[], options: ProcessOptions): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd: options.cwd, env: options.env, shell: false });

      let stdout = '';
      let stderr = '';
      child.stdout.setEncoding('utf8');
      child.stderr.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk;
      });
      child.stderr.on('data', (chunk: string) => {
        stderr += chunk;
      });

      child.on('error', reject);
      child.on('close', (code: number | null) => {
        resolve({ exitCode: code ?? 1, stdout, stderr });
      });
    });
  }
}
