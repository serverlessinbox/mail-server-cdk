import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir }                        from 'node:os';
import { dirname, join }                 from 'node:path';

import { InstalledPackageFinder }        from '../installed-package-finder';

/**
 * Pins which installed copies of a package the finder reports: top-level, scoped and nested
 * `node_modules` copies, sorted. Skipping nested copies hides a second `aws-cdk-lib` that a packed
 * peer pulled in, which is the duplicate the synthesis check exists to catch.
 */
describe('InstalledPackageFinder', () => {
  let projectDirectory: string;
  let finder: InstalledPackageFinder;

  beforeEach(async () => {
    projectDirectory = await mkdtemp(join(tmpdir(), 'pack-install-synth-'));
    finder           = new InstalledPackageFinder();
  });

  afterEach(async () => {
    await rm(projectDirectory, { recursive: true, force: true });
  });

  it('finds a top-level copy', async () => {
    const copy = await writePackage(projectDirectory, 'node_modules/aws-cdk-lib', 'aws-cdk-lib');

    expect(await finder.find(projectDirectory, 'aws-cdk-lib')).toEqual([copy]);
  });

  it('finds a nested copy and returns both copies sorted', async () => {
    const topLevel = await writePackage(projectDirectory, 'node_modules/aws-cdk-lib', 'aws-cdk-lib');
    const nested   = await writePackage(
      projectDirectory,
      'node_modules/mailbox/node_modules/aws-cdk-lib',
      'aws-cdk-lib',
    );
    await writePackage(projectDirectory, 'node_modules/mailbox', 'mailbox');

    expect(await finder.find(projectDirectory, 'aws-cdk-lib')).toEqual([topLevel, nested]);
  });

  it('finds a scoped package', async () => {
    const copy = await writePackage(projectDirectory, 'node_modules/@scope/pkg', '@scope/pkg');

    expect(await finder.find(projectDirectory, '@scope/pkg')).toEqual([copy]);
  });

  it('returns an empty list when the package is not installed', async () => {
    await writePackage(projectDirectory, 'node_modules/mailbox', 'mailbox');

    expect(await finder.find(projectDirectory, 'constructs')).toEqual([]);
  });
});

/** Writes a `package.json` with `name` into `relativeDirectory` and returns that folder's absolute path. */
async function writePackage(root: string, relativeDirectory: string, name: string): Promise<string> {
  const packageDirectory = join(root, relativeDirectory);
  await mkdir(dirname(join(packageDirectory, 'package.json')), { recursive: true });
  await writeFile(join(packageDirectory, 'package.json'), JSON.stringify({ name, version: '1.0.0' }));
  return packageDirectory;
}
