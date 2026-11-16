import { LibraryImportReader } from '../library-import-reader';

/**
 * The reader's result decides which names reach the shared libraries file: a name it misses is
 * absent at run time, and a default import it lets through would be served the wrong object.
 */
describe('LibraryImportReader', () => {
  const reader = new LibraryImportReader();

  it('reads the imported name, not the local alias', () => {
    expect(reader.read('import { a, b as c } from "x";', 'file.js')).toEqual([
      { specifier: 'x', names: ['a', 'b'], isNamespace: false },
    ]);
  });

  it('reads a namespace import as the whole module', () => {
    expect(reader.read('import * as ns from "x";', 'file.js')).toEqual([
      { specifier: 'x', names: [], isNamespace: true },
    ]);
  });

  it('reads an import for side effects as no names', () => {
    expect(reader.read('import "x";', 'file.js')).toEqual([
      { specifier: 'x', names: [], isNamespace: false },
    ]);
  });

  it('reads a re-export by the name it takes from the module', () => {
    expect(reader.read('export { a as z } from "x";', 'file.js')).toEqual([
      { specifier: 'x', names: ['a'], isNamespace: false },
    ]);
  });

  it('reads a star re-export as the whole module', () => {
    expect(reader.read('export * from "x";', 'file.js')).toEqual([
      { specifier: 'x', names: [], isNamespace: true },
    ]);
  });

  it('rejects a default import, naming the file and the specifier', () => {
    expect(() => reader.read('import d from "x";', 'out/file.js')).toThrow('out/file.js imports the default export of "x"');
  });

  it('rejects a default import next to named ones', () => {
    expect(() => reader.read('import d, { a } from "x";', 'out/file.js')).toThrow('out/file.js imports the default export of "x"');
  });

  it('rejects a re-exported default', () => {
    expect(() => reader.read('export { default } from "x";', 'out/file.js')).toThrow('out/file.js imports the default export of "x"');
  });

  it('returns a relative specifier unchanged, leaving the filtering to the caller', () => {
    expect(reader.read('import { a } from "./local";', 'file.js')).toEqual([
      { specifier: './local', names: ['a'], isNamespace: false },
    ]);
  });
});
