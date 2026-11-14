import { BundledLibraries }         from '../../bundled-libraries';
import { bundledLibraryScanPlugin } from '../bundled-library-scan';

import { StubPluginBuild }          from './stub-plugin-build';

/** The scan decides which imports become bundled libraries; a builtin or relative import declared here would break the package at run time. */
describe('bundledLibraryScanPlugin', () => {
  const packageFolder = '/r/mailbox';
  let libraries: BundledLibraries;
  let stub: StubPluginBuild;

  beforeEach(() => {
    libraries = new BundledLibraries(packageFolder);
    stub      = new StubPluginBuild();
    stub.registerPlugin(bundledLibraryScanPlugin(libraries));
  });

  it('declares a bare specifier and leaves it external', async () => {
    await expect(stub.resolve({ kind: 'import-statement', path: 'typanion', importer: '/r/mailbox/src/a.ts' }))
      .resolves.toEqual({ path: 'typanion', external: true });

    expect(libraries.has('typanion')).toBe(true);
  });

  it.each([
    ['a relative path', 'import-statement', './local'],
    ['an absolute path', 'import-statement', '/abs/file.js'],
    ['a builtin', 'import-statement', 'path'],
    ['a require call', 'require-call', 'typanion'],
  ] as const)('leaves %s alone', async (_title, kind, path) => {
    await expect(stub.resolve({ kind, path, importer: '/r/mailbox/src/a.ts' })).resolves.toBeUndefined();

    expect(libraries.has(path)).toBe(false);
  });
});
