import { build }                   from 'esbuild';
import type { Plugin }             from 'esbuild';
import { dirname, join, relative } from 'path';

import type { LibraryImport }      from './library-import';

const sharedFileName = 'bundled-libraries';

/** What the output files take from one library, collected across the package. */
interface LibraryUse {
  readonly names: Set<string>;
  isNamespace:    boolean;
}

/**
 * The libraries a jsii package's output files import by bare specifier, and the names they take.
 * Writes them once into `lib/bundled-libraries.js`, which holds only those names; the output files
 * reach it through a `require`.
 */
export class BundledLibraries {
  public readonly outputFile: string;

  private readonly uses = new Map<string, LibraryUse>();

  constructor(private readonly packageFolder: string) {
    this.outputFile = join(packageFolder, 'lib', `${sharedFileName}.js`);
  }

  public declare(specifier: string): void {
    if (!this.uses.has(specifier)) {
      this.uses.set(specifier, { names: new Set<string>(), isNamespace: false });
    }
  }

  public has(specifier: string): boolean {
    return this.uses.has(specifier);
  }

  /** An import of a specifier that was never declared is ignored. */
  public record(libraryImport: LibraryImport): void {
    const use = this.uses.get(libraryImport.specifier);
    if (!use) {
      return;
    }
    libraryImport.names.forEach(name => use.names.add(name));
    use.isNamespace = use.isNamespace || libraryImport.isNamespace;
  }

  /** The `require` path from the output file of a source file under `src/` to the shared file. */
  public requirePathFrom(importer: string): string {
    const outputDirectory = dirname(join(this.packageFolder, 'lib', relative(join(this.packageFolder, 'src'), importer)));
    const path            = relative(outputDirectory, join(this.packageFolder, 'lib', sharedFileName)).replace(/\\/g, '/');
    return path.startsWith('.') ? path : `./${path}`;
  }

  /** Writes nothing when no specifier was declared. */
  public async build(plugins: Plugin[]): Promise<void> {
    if (this.uses.size === 0) {
      return;
    }
    await build({
      stdin:    { contents: this.contentsFor([...this.uses.keys()].sort()), resolveDir: this.packageFolder, sourcefile: `${sharedFileName}.ts`, loader: 'ts' },
      outfile:  this.outputFile,
      bundle:   true,
      platform: 'node',
      format:   'cjs',
      logLevel: 'info',
      plugins,
    });
  }

  private contentsFor(specifiers: string[]): string {
    const imports: string[] = [];
    const entries: string[] = [];

    specifiers.forEach((specifier, index) => {
      const use     = this.uses.get(specifier) as LibraryUse; // cast: the specifiers come from this map's own keys
      const library = JSON.stringify(specifier);
      if (use.isNamespace) {
        imports.push(`import * as library${index} from ${library};`);
        entries.push(`${library}: library${index}`);
      } else if (use.names.size > 0) {
        const names = [...use.names].sort();
        imports.push(`import { ${names.map((name, nameIndex) => `${JSON.stringify(name)} as library${index}_${nameIndex}`).join(', ')} } from ${library};`);
        entries.push(`${library}: { ${names.map((name, nameIndex) => `${JSON.stringify(name)}: library${index}_${nameIndex}`).join(', ')} }`);
      } else {
        imports.push(`import ${library};`);
        entries.push(`${library}: {}`);
      }
    });

    return `${imports.join('\n')}\nexport const libraries = { ${entries.join(', ')} };\n`;
  }
}
