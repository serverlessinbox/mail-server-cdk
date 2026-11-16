/**
 * What one output file takes from a library: the named exports it imports, or the whole module
 * when `isNamespace`. A side-effect-only import has no names and is not a namespace.
 */
export interface LibraryImport {
  readonly specifier:   string;
  readonly names:       readonly string[];
  readonly isNamespace: boolean;
}
