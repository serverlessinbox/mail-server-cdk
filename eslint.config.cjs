require('@serverlessinbox/eslint-plugin-mail-server/register');
const mailServer = require('@serverlessinbox/eslint-plugin-mail-server');

module.exports = [
  {
    ignores: ['lib/', 'dist/', '**/*.d.ts', '**/*.js', '.yarn/', 'remote-git/', '**/*_pb.ts', '**/generated/**', 'build/', '.pnp.cjs', '.pnp.loader.mjs'],
  },
  ...mailServer.configs.recommended({ tsconfigRootDir: __dirname }),
];
