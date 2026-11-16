import { recommendedConfig } from './configs/recommended-config';
import { mailboxRules }      from './rules/mailbox-rules';

const plugin = {
  meta: {
    name:    '@serverlessinbox/eslint-plugin-mail-server',
    version: '0.0.0',
  },
  rules:   mailboxRules,
  configs: {
    recommended: recommendedConfig,
  },
};

export = plugin;
