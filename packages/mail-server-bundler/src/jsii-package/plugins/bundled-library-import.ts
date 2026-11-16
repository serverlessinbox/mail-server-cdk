import type { Plugin, PluginBuild } from 'esbuild';

import type { BundledLibraries }    from '../bundled-libraries';

const stubNamespace = 'bundled-library';

/** The module a bundled library's import resolves to: it hands out the library from the shared file. */
interface BundledLibraryStub {
  readonly specifier:   string;
  readonly requirePath: string;
}

/**
 * Turns every import of a declared bundled library into a stub module that requires the shared
 * libraries file, so the output file carries no library code. esbuild inlines the stub, which
 * keeps named and namespace imports working.
 */
export function bundledLibraryImportPlugin(packageFolder: string, libraries: BundledLibraries): Plugin {
  const stubs = new Map<string, BundledLibraryStub>();
  return {
    name: 'bundledLibraryImport',
    setup(build: PluginBuild) {
      build.onResolve({ filter: /.*/ }, args => {
        if (args.namespace === stubNamespace && args.kind === 'require-call') {
          return { path: args.path, external: true };
        }
        if (args.kind === 'import-statement' && libraries.has(args.path)) {
          const requirePath = libraries.requirePathFrom(args.importer);
          const key         = `${requirePath}!${args.path}`;
          stubs.set(key, { specifier: args.path, requirePath });
          return { path: key, namespace: stubNamespace };
        }
        return undefined;
      });

      build.onLoad({ filter: /.*/, namespace: stubNamespace }, args => {
        const stub = stubs.get(args.path);
        if (!stub) {
          throw new Error(`No bundled library stub was resolved for ${args.path}`);
        }
        return {
          contents:   `module.exports = require(${JSON.stringify(stub.requirePath)}).libraries[${JSON.stringify(stub.specifier)}];`,
          loader:     'js',
          resolveDir: packageFolder,
        };
      });
    },
  };
}
