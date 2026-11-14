import { build }                        from 'esbuild';
import { glob }                         from 'glob';
import { join, relative }               from 'path';

import { BundledLibraries }             from './bundled-libraries';
import { LibraryImportReader }          from './library-import-reader';
import { bundledLibraryImportPlugin }   from './plugins/bundled-library-import';
import { bundledLibraryScanPlugin }     from './plugins/bundled-library-scan';
import { jsiiIgnorePlugin }             from './plugins/jsii-ignore';
import { localLibImportPlugin }         from './plugins/local-lib-import';
import { typescriptDeclarationsPlugin } from './plugins/typescript-declarations';
import { SharedDeclarationsInliner }    from './shared-declarations-inliner';

const sourcesWithoutDeclarationsGlob = 'src/**/!(*.d).ts';
const testFoldersGlob                = 'src/**/__tests__/**';
const inlinedPackageName             = '@serverlessinbox/mailbox-cdk-shared';

/**
 * Bundles the TypeScript sources of a jsii package into its `lib/` folder, leaving jsii packages
 * and relative imports external, and emits the `.d.ts` files once the bundle succeeds. The kit
 * and every other bare library the package imports are bundled once, trimmed to the names the
 * package imports, into `lib/bundled-libraries.js`; the other output files require it. The
 * declarations of `@serverlessinbox/mailbox-cdk-shared`, whose code esbuild inlines, are copied
 * into `lib/` so the emitted declarations never import that package.
 * `jsiiExcludes` are the package's jsii `excludeTypescript` paths, relative to the package folder.
 * Test folders (`__tests__`) are left out: they are never part of the built library.
 * Rejects when esbuild reports errors, when an entry would write the shared file, or when the
 * declaration emit exits non-zero.
 */
export async function bundleJsiiPackage(absoluteFolder: string, jsiiExcludes: string[]): Promise<void> {
  const ignorePatterns = [...jsiiExcludes, testFoldersGlob].map(excludePath => join(absoluteFolder, excludePath));
  const entryPoints    = await glob(join(absoluteFolder, sourcesWithoutDeclarationsGlob), { ignore: ignorePatterns });
  const libraries      = new BundledLibraries(absoluteFolder);
  const sourceFolder   = join(absoluteFolder, 'src');
  const outputFolder   = join(absoluteFolder, 'lib');

  const clashingEntry = entryPoints.find(entry => join(outputFolder, relative(sourceFolder, entry)).replace(/\.ts$/, '.js') === libraries.outputFile);
  if (clashingEntry) {
    throw new Error(`${clashingEntry} would write ${libraries.outputFile}, which holds the bundled libraries`);
  }

  const scan = await build({
    plugins: [jsiiIgnorePlugin(absoluteFolder), localLibImportPlugin(absoluteFolder), bundledLibraryScanPlugin(libraries)],
    entryPoints,
    outdir:   outputFolder,
    outbase:  sourceFolder,
    bundle:   true,
    platform: 'node',
    format:   'esm',
    write:    false,
    logLevel: 'info',
  });
  const reader = new LibraryImportReader();
  for (const outputFile of scan.outputFiles) {
    reader.read(outputFile.text, outputFile.path).forEach(libraryImport => libraries.record(libraryImport));
  }

  await build({
    plugins: [
      jsiiIgnorePlugin(absoluteFolder),
      localLibImportPlugin(absoluteFolder),
      bundledLibraryImportPlugin(absoluteFolder, libraries),
      typescriptDeclarationsPlugin(absoluteFolder, new SharedDeclarationsInliner(absoluteFolder, inlinedPackageName)),
    ],
    entryPoints,
    outdir:   outputFolder,
    outbase:  sourceFolder,
    bundle:   true,
    platform: 'node',
    logLevel: 'info',
  });

  await libraries.build([jsiiIgnorePlugin(absoluteFolder)]);
}
