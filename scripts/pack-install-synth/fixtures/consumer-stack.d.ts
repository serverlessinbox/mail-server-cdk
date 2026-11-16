/** The modules the example consumer stack is built from: the source packages or the packed ones. */
export interface ConsumerModules {
  readonly cdk: typeof import('aws-cdk-lib');
  readonly mailbox: typeof import('../../../packages/mail-server/src/index');
  readonly cognito: typeof import('../../../packages/mail-server-cognito/src/index');
}

/** Builds the example consumer stack from the given modules and returns it, unsynthesized. */
export function build(modules: ConsumerModules): import('aws-cdk-lib').Stack;
