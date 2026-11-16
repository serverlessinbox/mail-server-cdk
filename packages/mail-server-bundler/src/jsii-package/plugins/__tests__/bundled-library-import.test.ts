import { build }                                             from 'esbuild';
import type { Plugin }                                       from 'esbuild';
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'fs/promises';
import { tmpdir }                                            from 'os';
import { dirname, join }                                     from 'path';

import { BundledLibraries }                                  from '../../bundled-libraries';
import { LibraryImportReader }                               from '../../library-import-reader';
import { bundledLibraryImportPlugin }                        from '../bundled-library-import';
import { bundledLibraryScanPlugin }                          from '../bundled-library-scan';
import { localLibImportPlugin }                              from '../local-lib-import';

interface SharedModule {
  readonly libraries: Record<string, Record<string, unknown>>;
}

/**
 * Output files must carry no library code and reach the one shared file by a `require`; a
 * library body left in an output file is the duplication this plugin exists to remove.
 */
describe('bundledLibraryImportPlugin', () => {
  let packageFolder: string;
  let libraries: BundledLibraries;

  beforeEach(async () => {
    packageFolder = await realpath(await mkdtemp(join(tmpdir(), 'bundled-library-import-test-')));
    libraries     = new BundledLibraries(packageFolder);
    await writeFile(join(packageFolder, 'package.json'), '{}');
    await writeSource('node_modules/fixture-lib/package.json', JSON.stringify({ name: 'fixture-lib', type: 'module', main: 'index.js' }));
    await writeSource('node_modules/fixture-lib/index.js', [
      'globalThis.__libraryLoads = (globalThis.__libraryLoads ?? 0) + 1;',
      "export function first() { return 'FIRST-MARKER'; }",
      "export function second() { return 'SECOND-MARKER'; }",
      "export function unused() { return 'UNUSED-MARKER'; }",
    ].join('\n'));
  });

  afterEach(async () => {
    await rm(packageFolder, { recursive: true, force: true });
    delete (globalThis as Record<string, unknown>).__libraryLoads;
  });

  async function writeSource(path: string, content: string): Promise<void> {
    const target = join(packageFolder, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }

  async function bundleOutputs(entries: string[], plugins: Plugin[]): Promise<Map<string, string>> {
    const result = await build({
      entryPoints: entries.map(entry => join(packageFolder, entry)),
      outdir:      join(packageFolder, 'lib'),
      outbase:     join(packageFolder, 'src'),
      bundle:      true,
      write:       false,
      platform:    'node',
      format:      'cjs',
      plugins:     [localLibImportPlugin(packageFolder), ...plugins],
    });
    return new Map(result.outputFiles.map(file => [file.path, file.text]));
  }

  it('replaces an import of a declared library with a require of the shared file', async () => {
    await writeSource('src/entry.ts', "import { first } from 'fixture-lib'; console.log(first());");
    libraries.declare('fixture-lib');

    const outputs = await bundleOutputs(['src/entry.ts'], [bundledLibraryImportPlugin(packageFolder, libraries)]);

    const output = outputs.get(join(packageFolder, 'lib', 'entry.js')) as string;
    expect(output).toContain('require("./bundled-libraries")');
    expect(output).not.toContain('FIRST-MARKER');
  });

  it('points a nested importer at the shared file one folder up', async () => {
    await writeSource('src/nested/entry.ts', "import { first } from 'fixture-lib'; console.log(first());");
    libraries.declare('fixture-lib');

    const outputs = await bundleOutputs(['src/nested/entry.ts'], [bundledLibraryImportPlugin(packageFolder, libraries)]);

    expect(outputs.get(join(packageFolder, 'lib', 'nested', 'entry.js'))).toContain('require("../bundled-libraries")');
  });

  it('leaves an import of an undeclared library to be bundled as usual', async () => {
    await writeSource('src/entry.ts', "import { first } from 'fixture-lib'; console.log(first());");

    const outputs = await bundleOutputs(['src/entry.ts'], [bundledLibraryImportPlugin(packageFolder, libraries)]);

    const output = outputs.get(join(packageFolder, 'lib', 'entry.js')) as string;
    expect(output).toContain('FIRST-MARKER');
    expect(output).not.toContain('bundled-libraries');
  });

  it('loads a library once for several output files, each importing different names', async () => {
    await writeSource('src/one.ts', "import { first } from 'fixture-lib'; export const one = first;");
    await writeSource('src/two.ts', "import { second } from 'fixture-lib'; export const two = second;");

    const scan = await build({
      entryPoints: [join(packageFolder, 'src', 'one.ts'), join(packageFolder, 'src', 'two.ts')],
      outdir:      join(packageFolder, 'lib'),
      outbase:     join(packageFolder, 'src'),
      bundle:      true,
      write:       false,
      platform:    'node',
      format:      'esm',
      plugins:     [localLibImportPlugin(packageFolder), bundledLibraryScanPlugin(libraries)],
    });
    scan.outputFiles.forEach(file => new LibraryImportReader().read(file.text, file.path).forEach(item => libraries.record(item)));
    const outputs = await bundleOutputs(['src/one.ts', 'src/two.ts'], [bundledLibraryImportPlugin(packageFolder, libraries)]);
    await libraries.build([]);
    for (const [path, text] of outputs) {
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, text);
    }

    const one    = jest.requireActual<{ one: unknown }>(join(packageFolder, 'lib', 'one.js')).one;
    const two    = jest.requireActual<{ two: unknown }>(join(packageFolder, 'lib', 'two.js')).two;
    const shared = jest.requireActual<SharedModule>(libraries.outputFile).libraries['fixture-lib'];
    expect((globalThis as Record<string, unknown>).__libraryLoads).toBe(1);
    expect(one).toBe(shared.first);
    expect(two).toBe(shared.second);
    expect(await readFile(libraries.outputFile, 'utf8')).not.toContain('UNUSED-MARKER');
  });
});
