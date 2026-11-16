require('@serverlessinbox/eslint-plugin-mail-server/register');
const mailbox = require('@serverlessinbox/eslint-plugin-mail-server');

module.exports = [
  {
    ignores: ['lib/', 'dist/', '**/*.d.ts', '**/*.js', '.yarn/', 'remote-git/', '**/*_pb.ts', '**/generated/**', 'build/', '.pnp.cjs', '.pnp.loader.mjs'],
  },
  ...mailbox.configs.recommended({ tsconfigRootDir: __dirname }),
];
