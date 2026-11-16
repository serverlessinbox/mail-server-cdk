import { build }                                from 'esbuild';
import type { BuildResult, OutputFile, Plugin } from 'esbuild';
import { mkdir, mkdtemp, rm, writeFile }        from 'fs/promises';
import { tmpdir }                               from 'os';
import { dirname, join }                        from 'path';

import { bundleJsiiPackage }                    from '../bundle-jsii-package';
import { BundledLibraries }                     from '../bundled-libraries';
import { LibraryImportReader }                  from '../library-import-reader';
import type { LibraryImport }                   from '../library-import';
import { SharedDeclarationsInliner }            from '../shared-declarations-inliner';

jest.mock('esbuild', () => {
  const actual = jest.requireActual<typeof import('esbuild')>('esbuild');
  return { ...actual, build: jest.fn() };
});
jest.mock('../shared-declarations-inliner');
jest.mock('../bundled-libraries');
jest.mock('../library-import-reader');

interface FixtureFile {
  readonly path:    string;
  readonly content: string;
}

const emptyBuildResult: BuildResult = { errors: [], warnings: [], outputFiles: undefined, metafile: undefined, mangleCache: undefined };

const scannedOutput: OutputFile    = { path: '/scanned/a.js', contents: new Uint8Array(), hash: 'hash', text: 'import "x";' };
const scanBuildResult: BuildResult = { ...emptyBuildResult, outputFiles: [scannedOutput] };
const scannedImport: LibraryImport = { specifier: 'x', names: [], isNamespace: false };

const sourceFixtures: FixtureFile[] = [
  { path: 'src/a.ts',           content: "export const a = 'A';" },
  { path: 'src/sub/c.ts',       content: "export const c = 'C';" },
  { path: 'src/generated/g.ts', content: "export const g = 'G';" },
  { path: 'src/types.d.ts',     content: 'export declare const t: string;' },
  { path: 'src/__tests__/a.test.ts',     content: "export const testA = 'A';" },
  { path: 'src/sub/__tests__/c.test.ts', content: "export const testC = 'C';" },
];

let packageFolder: string;
const recordSpy         = jest.fn();
const librariesBuildSpy = jest.fn<Promise<void>, [Plugin[]]>();

async function writeFixtures(files: FixtureFile[]): Promise<void> {
  for (const file of files) {
    const target = join(packageFolder, file.path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, file.content);
  }
}

function scanOptions() {
  const [options] = jest.mocked(build).mock.calls[0];
  return options;
}

function buildOptions() {
  const [options] = jest.mocked(build).mock.calls[1];
  return options;
}

beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(build).mockResolvedValueOnce(scanBuildResult).mockResolvedValue(emptyBuildResult);
  jest.mocked(LibraryImportReader.prototype.read).mockReturnValue([scannedImport]);
  librariesBuildSpy.mockResolvedValue(undefined);
  jest.mocked(BundledLibraries).mockImplementation(folder => {
    // cast: the automocked class has no constructor body, so the instance is given the one field and the methods the bundler uses.
    return { outputFile: join(folder, 'lib', 'bundled-libraries.js'), record: recordSpy, build: librariesBuildSpy } as unknown as BundledLibraries;
  });
  packageFolder = await mkdtemp(join(tmpdir(), 'bundle-jsii-test-'));
  await writeFixtures(sourceFixtures);
});

afterEach(async () => {
  await rm(packageFolder, { recursive: true, force: true });
});

describe('bundleJsiiPackage', () => {
  it('leaves the jsii excludes and test folders out of the entry points', async () => {
    await bundleJsiiPackage(packageFolder, ['src/generated/**']);

    const options = buildOptions();
    expect(options.entryPoints).toHaveLength(2);
    expect(options.entryPoints).toEqual(expect.arrayContaining([
      join(packageFolder, 'src', 'a.ts'),
      join(packageFolder, 'src', 'sub', 'c.ts'),
    ]));
  });

  it('leaves declaration files out of the entry points', async () => {
    await bundleJsiiPackage(packageFolder, []);

    expect(buildOptions().entryPoints).not.toContain(join(packageFolder, 'src', 'types.d.ts'));
  });

  it('bundles into lib/ with the jsii-ignore, local-lib-import, library-import and declarations plugins, in that order', async () => {
    await bundleJsiiPackage(packageFolder, []);

    const options = buildOptions();
    expect(options.outdir).toBe(join(packageFolder, 'lib'));
    expect(options.outbase).toBe(join(packageFolder, 'src'));
    expect(options.plugins?.map(plugin => plugin.name)).toEqual(['jsiiIgnore', 'localLibImport', 'bundledLibraryImport', 'typescriptDeclarations']);
  });

  it('scans in memory as ES modules with the jsii-ignore, local-lib-import and scan plugins', async () => {
    await bundleJsiiPackage(packageFolder, []);

    const options = scanOptions();
    expect(options.write).toBe(false);
    expect(options.format).toBe('esm');
    expect(options.plugins?.map(plugin => plugin.name)).toEqual(['jsiiIgnore', 'localLibImport', 'bundledLibraryScan']);
  });

  it('records what each scanned output file imports and writes the shared file once, after both builds', async () => {
    await bundleJsiiPackage(packageFolder, []);

    expect(LibraryImportReader.prototype.read).toHaveBeenCalledWith('import "x";', '/scanned/a.js');
    expect(recordSpy).toHaveBeenCalledWith(scannedImport);
    expect(librariesBuildSpy).toHaveBeenCalledTimes(1);
    expect(librariesBuildSpy.mock.calls[0][0].map(plugin => plugin.name)).toEqual(['jsiiIgnore']);
    expect(librariesBuildSpy.mock.invocationCallOrder[0]).toBeGreaterThan(jest.mocked(build).mock.invocationCallOrder[1]);
  });

  it('rejects an entry whose output would be the shared libraries file', async () => {
    await writeFixtures([{ path: 'src/bundled-libraries.ts', content: 'export const b = 1;' }]);

    await expect(bundleJsiiPackage(packageFolder, [])).rejects.toThrow('which holds the bundled libraries');
    expect(build).not.toHaveBeenCalled();
  });

  it('has the declarations plugin inline the declarations of mail-server-cdk-shared into the package', async () => {
    await bundleJsiiPackage(packageFolder, []);

    expect(SharedDeclarationsInliner).toHaveBeenCalledWith(packageFolder, '@serverlessinbox/mail-server-cdk-shared');
  });
});
