import { createSourceFile, isExportDeclaration, isImportDeclaration,
  isNamedExports, isNamedImports, isNamespaceImport, isStringLiteral,
  ScriptKind, ScriptTarget }                                                    from 'typescript';
import type { ExportDeclaration, ExportSpecifier, ImportDeclaration,
  ImportSpecifier }                                                             from 'typescript';

import type { LibraryImport }                                                   from './library-import';

/**
 * Reads the imports and re-exports of an ES-module output file: which names it takes from each
 * module. It does not decide which specifiers matter. A default import is an error, because the
 * shared libraries file serves each library as a namespace-shaped entry.
 */
export class LibraryImportReader {
  public read(code: string, fileName: string): LibraryImport[] {
    const sourceFile               = createSourceFile(fileName, code, ScriptTarget.ESNext, false, ScriptKind.JS);
    const imports: LibraryImport[] = [];

    for (const statement of sourceFile.statements) {
      if (isImportDeclaration(statement) && isStringLiteral(statement.moduleSpecifier)) {
        imports.push(this.readImport(statement, statement.moduleSpecifier.text, fileName));
      } else if (isExportDeclaration(statement) && statement.moduleSpecifier && isStringLiteral(statement.moduleSpecifier)) {
        imports.push(this.readExport(statement, statement.moduleSpecifier.text, fileName));
      }
    }
    return imports;
  }

  private readImport(declaration: ImportDeclaration, specifier: string, fileName: string): LibraryImport {
    const clause = declaration.importClause;
    if (clause?.name) {
      throw this.defaultImportError(fileName, specifier);
    }

    const bindings = clause?.namedBindings;
    if (bindings && isNamespaceImport(bindings)) {
      return { specifier, names: [], isNamespace: true };
    }
    if (bindings && isNamedImports(bindings)) {
      return { specifier, names: bindings.elements.map(element => this.namedExport(element, fileName, specifier)), isNamespace: false };
    }
    return { specifier, names: [], isNamespace: false };
  }

  private readExport(declaration: ExportDeclaration, specifier: string, fileName: string): LibraryImport {
    const clause = declaration.exportClause;
    if (clause && isNamedExports(clause)) {
      return { specifier, names: clause.elements.map(element => this.namedExport(element, fileName, specifier)), isNamespace: false };
    }
    return { specifier, names: [], isNamespace: true };
  }

  private namedExport(element: ImportSpecifier | ExportSpecifier, fileName: string, specifier: string): string {
    const name = (element.propertyName ?? element.name).text;
    if (name === 'default') {
      throw this.defaultImportError(fileName, specifier);
    }
    return name;
  }

  private defaultImportError(fileName: string, specifier: string): Error {
    return new Error(`${fileName} imports the default export of "${specifier}"; bundled libraries are shared by name only`);
  }
}
