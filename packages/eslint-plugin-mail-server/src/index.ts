import { recommendedConfig } from './configs/recommended-config';
import { mailServerRules }   from './rules/mail-server-rules';

const plugin = {
  meta: {
    name:    '@serverlessinbox/eslint-plugin-mail-server',
    version: '0.0.0',
  },
  rules:   mailServerRules,
  configs: {
    recommended: recommendedConfig,
  },
};

export = plugin;
