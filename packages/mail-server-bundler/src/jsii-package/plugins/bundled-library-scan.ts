import type { Plugin, PluginBuild } from 'esbuild';
import { isBuiltin }                from 'module';
import { isAbsolute }               from 'path';

import type { BundledLibraries }    from '../bundled-libraries';

/**
 * Declares every bare import of the package's files as a bundled library and leaves it external,
 * so the scan build only reports which names each output file takes from it.
 */
export function bundledLibraryScanPlugin(libraries: BundledLibraries): Plugin {
  return {
    name: 'bundledLibraryScan',
    setup(build: PluginBuild) {
      build.onResolve({ filter: /.*/ }, args => {
        if (args.kind === 'import-statement' && !args.path.startsWith('.') && !isAbsolute(args.path) && !isBuiltin(args.path)) {
          libraries.declare(args.path);
          return { path: args.path, external: true };
        }
        return undefined;
      });
    },
  };
}
