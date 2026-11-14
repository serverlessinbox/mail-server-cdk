import { readFile, rm, writeFile } from 'node:fs/promises';
import { join }                    from 'node:path';

import type { PackageVersions }    from '../package-versions';
import { PackedSynthesizer }       from '../packed-synthesizer';
import type { ProcessResult }      from '../process-result';
import { ProcessRunner }           from '../process-runner';

/**
 * Pins how the packed side is built: the peers that are not packed are pinned to the versions the lock
 * resolves (never to the range text), a workspace peer that is not packed throws, and a failed synthesis
 * run is reported as a failure with no template. The tests fake the process boundary: pack, tar, yarn
 * and the packed runner are answered by the fake, which writes the template the real runner would.
 */
describe('PackedSynthesizer', () => {
  const workspaces                   = ['@serverlessinbox/mailbox'];
  const lockText                     = ['"constructs@npm:^10.0.0":', '  version: 10.4.2', '  resolution: "constructs@npm:10.4.2"', ''].join('\n');
  const okResult: ProcessResult      = { exitCode: 0, stdout: '', stderr: '' };
  const createdDirectories: string[] = [];

  afterEach(async () => {
    jest.restoreAllMocks();
    for (const directory of createdDirectories.splice(0)) {
      await rm(directory, { recursive: true, force: true });
    }
  });

  /** Answers the process boundary: `peerDependencies` is the packed manifest's peers, the runner exits with `runnerExitCode`. */
  function fakeProcesses(peerDependencies: PackageVersions, runnerExitCode = 0, runnerStderr = ''): void {
    jest.spyOn(ProcessRunner.prototype, 'run').mockImplementation(async (command, args) => {
      if (command === 'tar') {
        return { exitCode: 0, stdout: JSON.stringify({ peerDependencies }), stderr: '' };
      }
      if (command === 'node') {
        if (runnerExitCode === 0) {
          await writeFile(args[1], JSON.stringify({ Resources: { Fake: {} } }));
        }
        return { exitCode: runnerExitCode, stdout: '', stderr: runnerStderr };
      }
      return okResult;
    });
  }

  function synthesizer(): PackedSynthesizer {
    return new PackedSynthesizer(new ProcessRunner(), '/repository/root', workspaces, lockText, 1_700_000_000_000, 0.5);
  }

  it('returns the template the packed runner wrote, with no failure', async () => {
    fakeProcesses({});

    const result = await synthesizer().synthesize();
    createdDirectories.push(result.directory);

    expect(result.template).toEqual({ Resources: { Fake: {} } });
    expect(result.failure).toBeUndefined();
  });

  it('returns the runner stderr, from its first line, as the failure with no template when the packed runner exits non-zero', async () => {
    // Longer than the 2000 characters a tail of stdout and stderr would keep, so a tail cannot start with the error line.
    const runnerStderr = ['Error: runner-broke-marker', ...Array.from({ length: 300 }, () => '    at frame')].join('\n');
    fakeProcesses({}, 1, runnerStderr);

    const result = await synthesizer().synthesize();
    createdDirectories.push(result.directory);

    expect(result.template).toBeUndefined();
    expect(result.failure?.startsWith(runnerStderr.split('\n')[0])).toBe(true);
    expect(result.failure).toBe(runnerStderr);
  });

  it('throws, naming the package, when a peer that is not packed is declared as a workspace range', async () => {
    fakeProcesses({ 'some-lib': 'workspace:*' });

    await expect(synthesizer().synthesize()).rejects.toThrow('some-lib');
  });

  it('pins a peer to the version the lock resolves, not to its range text', async () => {
    fakeProcesses({ constructs: '^10.0.0' });

    const result = await synthesizer().synthesize();
    createdDirectories.push(result.directory);

    const manifest: unknown = JSON.parse(await readFile(join(result.directory, 'project', 'package.json'), 'utf8'));
    expect(manifest).toMatchObject({ dependencies: { constructs: '10.4.2' } });
  });
});
