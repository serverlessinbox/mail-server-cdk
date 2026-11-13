/**
 * Builds the example consumer stack from the modules it is given, so the same code runs against the
 * source packages and against the packed packages installed into a clean project.
 */
function build(modules) {
  const { cdk, mailbox, cognito } = modules;

  const app = new cdk.App();
  const stack = new cdk.Stack(app, 'ConsumerStack', {
    env: { account: '123456789012', region: 'eu-west-1' },
    synthesizer: new cdk.BootstraplessSynthesizer(),
  });

  const zone = new mailbox.HostedZoneLookup(stack, 'Zone', { hostedZoneId: 'Z0123456789ABCDEFGHIJ' });
  const userPool = new cognito.MailboxUserPool(stack, 'UserPool', {
    domain: { kind: 'cognito-auto', hostedZone: zone.hostedZone },
    enableJmapOAuthDiscovery: true,
  });
  userPool.addBootstrapUser({ username: 'admin', groups: ['admin'] });
  new mailbox.Mailbox(stack, 'Mailbox', { hostedZone: zone.hostedZone, authProvider: userPool });

  return stack;
}

module.exports = { build };
