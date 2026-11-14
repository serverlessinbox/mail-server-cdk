import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir }                from 'node:os';
import { join }                  from 'node:path';

import { ConsumerProject }       from '../consumer-project';
import { ProcessRunner }         from '../process-runner';

/**
 * Pins what the clean project is made of: the dependencies are the packed tarballs plus the exact peer
 * pins, the yarn config keeps scripts off and the install in node-modules mode, and the install runs with
 * NODE_OPTIONS removed. Inheriting NODE_OPTIONS would load the repository's PnP loader into the install.
 */
describe('ConsumerProject', () => {
  const tarballs = [{ name: '@serverlessinbox/mailbox', file: '/packed/mailbox.tgz' }];
  const peerPins = { constructs: '10.4.2' };
  let directory: string;
  let project: string;

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'pack-install-synth-'));
    project   = join(directory, 'project');
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(directory, { recursive: true, force: true });
  });

  it('writes a private consumer manifest with the tarballs as file dependencies and the peers pinned exactly', async () => {
    jest.spyOn(ProcessRunner.prototype, 'run').mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

    await new ConsumerProject(new ProcessRunner(), project).create(tarballs, peerPins);

    const manifest: unknown = JSON.parse(await readFile(join(project, 'package.json'), 'utf8'));
    expect(manifest).toEqual({
      name:         'consumer',
      private:      true,
      dependencies: {
        '@serverlessinbox/mailbox': 'file:/packed/mailbox.tgz',
        constructs:                 '10.4.2',
      },
    });
  });

  it('writes the yarn config with scripts and telemetry off and node-modules linking', async () => {
    jest.spyOn(ProcessRunner.prototype, 'run').mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

    await new ConsumerProject(new ProcessRunner(), project).create(tarballs, peerPins);

    expect(await readFile(join(project, '.yarnrc.yml'), 'utf8')).toBe(
      'nodeLinker: node-modules\nenableScripts: false\nenableImmutableInstalls: false\nenableTelemetry: false\n',
    );
  });

  it('copies the consumer stack and the packed runner from the fixtures', async () => {
    jest.spyOn(ProcessRunner.prototype, 'run').mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

    await new ConsumerProject(new ProcessRunner(), project).create(tarballs, peerPins);

    const fixtures = join(__dirname, '..', 'fixtures');
    expect(await readFile(join(project, 'consumer-stack.js'), 'utf8'))
      .toBe(await readFile(join(fixtures, 'consumer-stack.js'), 'utf8'));
    expect(await readFile(join(project, 'packed-runner.js'), 'utf8'))
      .toBe(await readFile(join(fixtures, 'packed-runner.js'), 'utf8'));
  });

  it('runs yarn install in the project without NODE_OPTIONS and keeps the other variables', async () => {
    const savedNodeOptions   = process.env.NODE_OPTIONS;
    process.env.NODE_OPTIONS = '--require ./pnp.cjs';
    try {
      const runSpy = jest.spyOn(ProcessRunner.prototype, 'run')
        .mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

      await new ConsumerProject(new ProcessRunner(), project).create(tarballs, peerPins);

      const [command, args, options] = runSpy.mock.calls[0];
      expect([command, args, options.cwd]).toEqual(['yarn', ['install'], project]);
      expect(options.env).not.toHaveProperty('NODE_OPTIONS');
      expect(options.env.PATH).toBe(process.env.PATH);
    } finally {
      if (savedNodeOptions === undefined) {
        delete process.env.NODE_OPTIONS;
      } else {
        process.env.NODE_OPTIONS = savedNodeOptions;
      }
    }
  });

  it('throws, with the end of the output, when yarn install exits non-zero', async () => {
    jest.spyOn(ProcessRunner.prototype, 'run')
      .mockResolvedValue({ exitCode: 1, stdout: 'install-failed-marker', stderr: '' });

    await expect(new ConsumerProject(new ProcessRunner(), project).create(tarballs, peerPins))
      .rejects.toThrow('Installing the consumer project failed with exit code 1: install-failed-marker');
  });
});
