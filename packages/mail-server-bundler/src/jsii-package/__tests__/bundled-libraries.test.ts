import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir }                                                    from 'os';
import { join }                                                      from 'path';

import { BundledLibraries }                                          from '../bundled-libraries';

interface SharedModule {
  readonly libraries: Record<string, Record<string, unknown>>;
}

/**
 * The shared libraries file is what every output file of a package requires at run time: it must
 * hold exactly the names the package imports and nothing the package never uses.
 */
describe('BundledLibraries', () => {
  let packageFolder: string;
  let libraries: BundledLibraries;

  beforeEach(async () => {
    packageFolder = await realpath(await mkdtemp(join(tmpdir(), 'bundled-libraries-test-')));
    libraries     = new BundledLibraries(packageFolder);
  });

  afterEach(async () => {
    await rm(packageFolder, { recursive: true, force: true });
  });

  async function writeLibrary(name: string, source: string): Promise<void> {
    const folder = join(packageFolder, 'node_modules', name);
    await mkdir(folder, { recursive: true });
    await writeFile(join(folder, 'package.json'), JSON.stringify({ name, type: 'module', main: 'index.js' }));
    await writeFile(join(folder, 'index.js'), source);
  }

  async function loadShared(): Promise<Record<string, Record<string, unknown>>> {
    return jest.requireActual<SharedModule>(libraries.outputFile).libraries;
  }

  describe('requirePathFrom', () => {
    it.each([
      ['src/index.ts', './bundled-libraries'],
      ['src/a/b.ts', '../bundled-libraries'],
      ['src/a/b/c.ts', '../../bundled-libraries'],
    ])('from %s is %s', (importer, expected) => {
      expect(libraries.requirePathFrom(join(packageFolder, importer))).toBe(expected);
    });
  });

  describe('build', () => {
    it('writes no file when no specifier was declared', async () => {
      await libraries.build([]);

      await expect(access(libraries.outputFile)).rejects.toThrow();
    });

    it('ignores an import of a specifier that was not declared', () => {
      libraries.record({ specifier: 'x', names: ['a'], isNamespace: false });

      expect(libraries.has('x')).toBe(false);
    });

    it('writes only the recorded names of each library, merged across records', async () => {
      await writeLibrary('lib-one', "export const value = 'ONE-VALUE'; export const used = 'ONE-USED'; export function unused() { return 'UNUSED-MARKER'; }");
      await writeLibrary('lib-two', "export const other = 'TWO-OTHER';");
      libraries.declare('lib-one');
      libraries.declare('lib-two');
      libraries.record({ specifier: 'lib-one', names: ['value'], isNamespace: false });
      libraries.record({ specifier: 'lib-one', names: ['used'], isNamespace: false });
      libraries.record({ specifier: 'lib-two', names: ['other'], isNamespace: false });

      await libraries.build([]);

      const shared = await loadShared();
      expect(shared).toEqual({
        'lib-one': { value: 'ONE-VALUE', used: 'ONE-USED' },
        'lib-two': { other: 'TWO-OTHER' },
      });
      expect(await readFile(libraries.outputFile, 'utf8')).not.toContain('UNUSED-MARKER');
    });

    it('exposes every export of a library imported as a namespace', async () => {
      await writeLibrary('lib-ns', "export const first = 1; export const second = 2;");
      libraries.declare('lib-ns');
      libraries.record({ specifier: 'lib-ns', names: [], isNamespace: true });

      await libraries.build([]);

      expect(await loadShared()).toMatchObject({ 'lib-ns': { first: 1, second: 2 } });
    });

    it('runs the top-level statement of a library imported for side effects', async () => {
      await writeLibrary('lib-effect', "globalThis.__bundledLibrariesEffect = (globalThis.__bundledLibrariesEffect ?? 0) + 1;");
      libraries.declare('lib-effect');
      libraries.record({ specifier: 'lib-effect', names: [], isNamespace: false });

      await libraries.build([]);

      const loaded = await loadShared();
      expect(loaded['lib-effect']).toEqual({});
      expect((globalThis as Record<string, unknown>).__bundledLibrariesEffect).toBe(1);
    });
  });
});
