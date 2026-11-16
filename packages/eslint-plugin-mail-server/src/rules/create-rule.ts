import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  (name) => `https://github.com/serverlessinbox/mail-server-cdk/tree/main/packages/eslint-plugin-mail-server#${name}`,
);
