/**
 * Pins the kit entries of the `no-restricted-syntax` rule: an `instanceof` other than `Error`, a module-level `let` or
 * `var`, and a module-level `WeakMap` or `WeakSet` are flagged in shared helper code, and the existing entries stay
 * in force there. A regression that stops matching one lets per-copy identity or module state back into the kit
 * unnoticed.
 */

import { Linter }                   from 'eslint';
import tseslint                     from 'typescript-eslint';

import { kitRestrictedSyntaxRules } from '../restricted-syntax-rules';

const linter                  = new Linter();
const config: Linter.Config[] = [
  {
    files:           ['**/*.ts'],
    languageOptions: { parser: tseslint.parser },
    rules:           kitRestrictedSyntaxRules,
  },
];

function restrictedSyntaxMessagesOf(code: string): string[] {
  return linter
    .verify(code, config, 'probe.ts')
    .filter((finding) => finding.ruleId === 'no-restricted-syntax')
    .map((finding) => finding.message);
}

describe('kitRestrictedSyntaxRules identity and module state entries', () => {
  it.each([
    'const isGroup = x instanceof PipelineLogGroup;',
    'let counter = 0;',
    'var counter = 0;',
    'export let counter = 0;',
    'const registry = new WeakMap();',
    'const registry = new WeakSet();',
    'export const registry = new WeakMap();',
    'export const registry = new WeakSet();',
  ])('flags %s', (code) => {
    const messages = restrictedSyntaxMessagesOf(code);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('KitSingleton');
  });

  it.each([
    'const failure = error instanceof Error;',
    'const sizes = new Set();',
    'function f() { let n = 0; return n; }',
    'function f() { const registry = new WeakMap(); return registry; }',
  ])('does not flag %s', (code) => {
    expect(restrictedSyntaxMessagesOf(code)).toEqual([]);
  });

  it('keeps the existing Partial entries in force for kit code', () => {
    const messages = restrictedSyntaxMessagesOf('type A = Partial<Foo>;');

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain('instead of Partial');
  });
});
