# Packages

The packages of this repository. Each has its own README.

| Package | What it is | Published | README |
|---|---|---|---|
| `@serverlessinbox/mail-server` | CDK construct library that deploys a complete serverless JMAP email server | Yes | [mailbox](mail-server/README.md) |
| `@serverlessinbox/mail-server-cognito` | Amazon Cognito as the authentication provider of a `mailbox` email server | Yes | [mailbox-cognito](mail-server-cognito/README.md) |
| `@serverlessinbox/mail-server-cdk-shared` | Building blocks shared by `mailbox` and `mailbox-cognito`; makes no compatibility promise | Yes | [mailbox-cdk-shared](mailbox-cdk-shared/README.md) |
| `@serverlessinbox/mail-server-addon-sdk` | Handler SDK for the Lambdas that serve the Admin API services of addons | No | [mailbox-addon-sdk](mailbox-addon-sdk/README.md) |
| `@serverlessinbox/mail-server-bundler` | Build tool that bundles Lambda handlers and jsii construct packages | No | [mail-server-bundler](mail-server-bundler/README.md) |
| `@serverlessinbox/eslint-plugin-mail-server` | ESLint plugin that enforces the structure of this repository | No | [eslint-plugin-mailbox](eslint-plugin-mailbox/README.md) |
