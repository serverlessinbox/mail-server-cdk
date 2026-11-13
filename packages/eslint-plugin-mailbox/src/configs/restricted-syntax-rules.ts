import type { TSESLint } from '@typescript-eslint/utils';

/** One `no-restricted-syntax` entry: an AST selector and the message shown when it matches. */
interface RestrictedSyntaxEntry {
  readonly selector: string;
  readonly message:  string;
}

const anonymousTypeMessage = 'Name the object type with an interface or type alias (strong-typing, no anonymous nested types).';
const requireMessage       = 'Use an import, or await import() for a config module (code-structure, I/O is async).';
const commandBody          = 'ClassDeclaration[superClass.name=/Command$/] > ClassBody';

const anonymousTypeEntries: readonly RestrictedSyntaxEntry[] = [
  ':function > Identifier > TSTypeAnnotation > TSTypeLiteral',
  ':function > AssignmentPattern > Identifier > TSTypeAnnotation > TSTypeLiteral',
  ':function > ObjectPattern > TSTypeAnnotation > TSTypeLiteral',
  'TSTypeAnnotation.returnType TSTypeLiteral',
  'PropertyDefinition > TSTypeAnnotation TSTypeLiteral',
  'TSPropertySignature > TSTypeAnnotation TSTypeLiteral',
].map((selector) => ({ selector, message: anonymousTypeMessage }));

const requireEntries: readonly RestrictedSyntaxEntry[] = [
  { selector: 'CallExpression[callee.name="require"]', message: requireMessage },
  { selector: 'MemberExpression[object.name="require"]', message: requireMessage },
];

// A clipanion command's Option fields are assigned by the framework, so command bodies are excluded.
const publicStateEntries: readonly RestrictedSyntaxEntry[] = [
  {
    selector: `:not(${commandBody}) > PropertyDefinition[accessibility!="private"][accessibility!="protected"][readonly!=true][key.type!="PrivateIdentifier"]`,
    message:  'Public class state is read-only: declare it readonly (typescript-class-design).',
  },
  {
    selector: `:not(${commandBody}) > TSParameterProperty[accessibility="public"][readonly!=true]`,
    message:  'Public class state is read-only: declare the constructor parameter property readonly (typescript-class-design).',
  },
  {
    selector: `:not(${commandBody}) > MethodDefinition[kind="set"][accessibility!="private"][accessibility!="protected"]`,
    message:  'A class has no public setter (typescript-class-design).',
  },
];

const partialMessage = 'Declare a named type or a discriminated union instead of Partial (strong-typing L-288).';

// `Partial<Record<K, V>>` over a closed key union is the sparse-lookup exception; an open string key is still flagged.
const partialEntries: readonly RestrictedSyntaxEntry[] = [
  {
    selector: 'TSTypeReference[typeName.name="Partial"]:not([typeArguments.params.0.typeName.name="Record"])',
    message:  partialMessage,
  },
  {
    selector: 'TSTypeReference[typeName.name="Partial"][typeArguments.params.0.typeName.name="Record"][typeArguments.params.0.typeArguments.params.0.type="TSStringKeyword"]',
    message:  partialMessage,
  },
];

const existingEntries: readonly RestrictedSyntaxEntry[] = [
  ...anonymousTypeEntries,
  ...requireEntries,
  ...publicStateEntries,
  ...partialEntries,
];

const kitIdentityMessage = 'Kit code is inlined as its own copy in each package, so classes, module variables and WeakMaps differ per copy. Mark once-per-stack classes with KitSingleton and keep registry state on the stack node.';

// Identity and module state are per copy of the kit: a second copy has its own classes, variables and WeakMaps.
const kitIdentityEntries: readonly RestrictedSyntaxEntry[] = [
  { selector: 'BinaryExpression[operator="instanceof"]:not([right.name="Error"])', message: kitIdentityMessage },
  { selector: 'Program > VariableDeclaration[kind=/^(let|var)$/]', message: kitIdentityMessage },
  { selector: 'Program > ExportNamedDeclaration > VariableDeclaration[kind=/^(let|var)$/]', message: kitIdentityMessage },
  { selector: 'Program > VariableDeclaration > VariableDeclarator[init.type="NewExpression"][init.callee.name=/^Weak(Map|Set)$/]', message: kitIdentityMessage },
  { selector: 'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type="NewExpression"][init.callee.name=/^Weak(Map|Set)$/]', message: kitIdentityMessage },
];

export const restrictedSyntaxRules: TSESLint.FlatConfig.Rules = {
  'no-restricted-syntax': ['error', ...existingEntries],
};

// A files-scoped no-restricted-syntax replaces the global list, so the kit block carries every existing entry too.
export const kitRestrictedSyntaxRules: TSESLint.FlatConfig.Rules = {
  'no-restricted-syntax': ['error', ...existingEntries, ...kitIdentityEntries],
};
