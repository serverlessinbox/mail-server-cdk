import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir }                from 'node:os';
import { join }                  from 'node:path';

import { ProcessRunner }         from '../process-runner';

/**
 * Pins what the packing and install steps rely on from a child process: both streams are collected
 * as text, the exit code is reported, and the working folder and environment are the ones given.
 * Loosening the env or cwd handling lets an install run in the wrong folder with the wrong variables.
 */
describe('ProcessRunner', () => {
  let runner: ProcessRunner;
  let directory: string;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'pack-install-synth-'));
  });

  beforeEach(() => {
    runner = new ProcessRunner();
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('collects stdout, stderr and the exit code of the process', async () => {
    const script = "process.stdout.write('out'); process.stderr.write('err'); process.exitCode = 3;";

    const result = await runner.run(process.execPath, ['-e', script], { cwd: directory, env: process.env });

    expect(result).toEqual({ exitCode: 3, stdout: 'out', stderr: 'err' });
  });

  it('runs the process with the environment it is given', async () => {
    const script = 'process.stdout.write(process.env.G2A_PROBE);';

    const result = await runner.run(process.execPath, ['-e', script], {
      cwd: directory,
      env: { G2A_PROBE: 'from-options' },
    });

    expect(result.stdout).toBe('from-options');
  });

  it('runs the process in the working folder it is given', async () => {
    const result = await runner.run(process.execPath, ['-e', 'process.stdout.write(process.cwd());'], {
      cwd: directory,
      env: process.env,
    });

    expect(result.stdout).toBe(await realpath(directory));
  });

  it('resolves with exit code 1 when the process is killed by a signal', async () => {
    const script = "process.kill(process.pid, 'SIGTERM');";

    const result = await runner.run(process.execPath, ['-e', script], { cwd: directory, env: process.env });

    expect(result.exitCode).toBe(1);
  });

  it('rejects when the command cannot be started', async () => {
    await expect(
      runner.run(join(directory, 'no-such-command-g2a'), [], { cwd: directory, env: process.env }),
    ).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
