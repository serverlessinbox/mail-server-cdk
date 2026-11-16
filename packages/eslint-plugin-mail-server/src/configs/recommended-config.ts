import type { TSESLint }                                   from '@typescript-eslint/utils';
import arca                                                from 'eslint-plugin-arca';
import { globSync }                                        from 'node:fs';
import tseslint                                            from 'typescript-eslint';

import { mailboxRules }                                    from '../rules/mailbox-rules';
import { kitSourceScope, sourceRuleScope }                 from '../zones/package-roots';

import { classFamilyFiles }                                from './class-family-files';
import { forbiddenGrantRules }                             from './forbidden-grant-helpers';
import { kitRestrictedSyntaxRules, restrictedSyntaxRules } from './restricted-syntax-rules';
import { styleRules }                                      from './style-rules';
import { syncFsRules }                                     from './sync-fs-rules';
import { synthTimeReaderFiles }                            from './synth-time-reader-files';
import { testFiles }                                       from './test-files';
import { typeSafetyRules }                                 from './type-safety-rules';

export interface RecommendedConfigOptions {
  readonly tsconfigRootDir: string;
  readonly extraConfigs?:   readonly TSESLint.FlatConfig.Config[];
}

export function recommendedConfig(options: RecommendedConfigOptions): TSESLint.FlatConfig.Config[] {
  const packageTsconfigs = globSync('packages/*/tsconfig.eslint.json', { cwd: options.tsconfigRootDir }).sort();
  const tsconfigs        = [...packageTsconfigs, 'packages/eslint-plugin-mail-server/tsconfig.json', 'tsconfig.scripts.json'];

  return [
    {
      files:           ['**/*.ts'],
      languageOptions: {
        parser:        tseslint.parser,
        parserOptions: {
          project:         tsconfigs,
          tsconfigRootDir: options.tsconfigRootDir,
        },
      },
      linterOptions: {
        noInlineConfig:                true,
        reportUnusedDisableDirectives: 'error',
      },
      plugins: {
        '@typescript-eslint': tseslint.plugin,
        arca,
        'mail-server': { rules: mailboxRules },
      },
      rules: {
        ...typeSafetyRules,
        ...styleRules,
        ...forbiddenGrantRules,
        ...restrictedSyntaxRules,
        ...syncFsRules,
        'mail-server/align':         'error',
        'mail-server/events-import': 'error',
        'mail-server/import-layout': 'error',
        'mail-server/kit-isolation': 'error',
        'mail-server/plan-labels':   'error',
        'mail-server/zone-imports':  'error',
      },
    },
    {
      files:   [...kitSourceScope.files],
      ignores: [...kitSourceScope.ignores],
      rules:   kitRestrictedSyntaxRules,
    },
    {
      files: [...classFamilyFiles],
      rules: { 'max-classes-per-file': 'off' },
    },
    {
      files: ['**/__tests__/**', '**/*.test.ts'],
      rules: { 'max-lines-per-function': 'off' },
    },
    {
      files: [...testFiles],
      rules: { 'no-restricted-imports': 'off', 'no-restricted-syntax': 'off' },
    },
    {
      files: [...synthTimeReaderFiles],
      rules: { 'no-restricted-imports': 'off' },
    },
    {
      files:   [...sourceRuleScope.files],
      ignores: [...sourceRuleScope.ignores],
      rules:   {
        'mail-server/iam-statement-home': 'error',
        'mail-server/logical-id-home':    'error',
        'mail-server/removal-home':       'error',
        'mail-server/resource-kind-home': 'error',
      },
    },
    ...(options.extraConfigs ?? []),
  ];
}
