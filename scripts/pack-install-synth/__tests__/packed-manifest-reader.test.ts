import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir }                        from 'node:os';
import { join }                          from 'node:path';

import type { JsonObject }               from '../../utils/json-value';
import { PackedManifestReader }          from '../packed-manifest-reader';
import { ProcessRunner }                 from '../process-runner';

/**
 * Pins which manifest field the reader returns: the peer ranges, not the runtime dependencies. The
 * tarballs are real, packed with the system `tar` into a temp folder, so the extraction is exercised too.
 */
describe('PackedManifestReader', () => {
  let directory: string;
  let runner: ProcessRunner;
  let reader: PackedManifestReader;

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), 'pack-install-synth-'));
  });

  beforeEach(() => {
    runner = new ProcessRunner();
    reader = new PackedManifestReader(runner);
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  /** Packs `package/package.json` holding the given manifest into a tarball named after `name`. */
  const createTarball = async (name: string, manifest: JsonObject): Promise<string> => {
    const packageParent = join(directory, name);
    await mkdir(join(packageParent, 'package'), { recursive: true });
    await writeFile(join(packageParent, 'package', 'package.json'), JSON.stringify(manifest));
    const tarball = join(directory, `${name}.tgz`);
    const result  = await runner.run('tar', ['-czf', tarball, 'package'], { cwd: packageParent, env: process.env });
    if (result.exitCode !== 0) {
      throw new Error(`tar failed: ${result.stderr}`);
    }
    return tarball;
  };

  it('returns the peer ranges and not the runtime dependencies', async () => {
    const tarball = await createTarball('with-peers', {
      name:             'with-peers',
      dependencies:     { typanion: '^3.14.0' },
      peerDependencies: { 'aws-cdk-lib': '^2.261.0', constructs: '^10.5.0' },
    });

    await expect(reader.peerDependencies(tarball)).resolves.toEqual({
      'aws-cdk-lib': '^2.261.0',
      constructs:    '^10.5.0',
    });
  });

  it('returns an empty record when the manifest declares no peer dependencies', async () => {
    const tarball = await createTarball('no-peers', {
      name:         'no-peers',
      dependencies: { typanion: '^3.14.0' },
    });

    await expect(reader.peerDependencies(tarball)).resolves.toEqual({});
  });

  it('throws when the tarball cannot be read', async () => {
    await expect(reader.peerDependencies(join(directory, 'missing.tgz')))
      .rejects.toThrow('Cannot read package/package.json');
  });
});
