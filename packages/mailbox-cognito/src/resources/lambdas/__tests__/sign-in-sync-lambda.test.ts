/// <reference types="jest" />

/**
 * Pins what the sign-in sync Lambda's construct gives the function: the timeout and memory it runs with, the
 * environment its rule is read from, the one IAM statement it grants itself, and the invoke permission and
 * provisioner access the pool and the admin API wire in. The pool and the provisioner are created outside this
 * construct, so each wiring method is asserted on the synthesized template. Each test builds its own stack,
 * because a stack cannot be changed after it has been synthesized.
 */

import { ArtifactZone, PinnedArtifactResolver }  from '@serverlessinbox/artifact-registry-cdk';
import { renderWithTokens, statementsForAction } from '@serverlessinbox/mail-server-cdk-shared/cdk-test-support';
import type { IIdentityProvisioner }             from '@serverlessinbox/mailbox';
import { Match, Template }                       from 'aws-cdk-lib/assertions';
import { UserPool }                              from 'aws-cdk-lib/aws-cognito';
import { App, BootstraplessSynthesizer, Stack }  from 'aws-cdk-lib';

import { SignInSyncLambda }                      from '../sign-in-sync-lambda';

const USER_POOL_ARN = 'arn:aws:cognito-idp:us-west-2:123456789012:userpool/us-west-2_abcdefgh';

const IDENTITY_PROVISIONER: IIdentityProvisioner = {
  functionArn:  'arn:aws:lambda:us-west-2:123456789012:function:identity-provisioner',
  functionName: 'identity-provisioner',
  grantInvoke:  jest.fn(),
};

function newSignInSyncLambda(): { stack: Stack; lambda: SignInSyncLambda } {
  const stack = new Stack(new App(), 'TestStack', {
    env:         { account: '123456789012', region: 'us-west-2' },
    synthesizer: new BootstraplessSynthesizer(),
  });
  const artifactResolver = new PinnedArtifactResolver({
    packages:         { 'mailbox-cognito': { version: '1.0.0', zone: ArtifactZone.REGIONAL } },
    location:         { bucketBase: 'test-artifacts', project: 'serverlessinbox' },
    deploymentRegion: stack.region,
  });
  const lambda = new SignInSyncLambda(stack, 'sign-in-sync', {
    artifactResolver,
    adminGroups: ['admin'],
    rule:        {
      userNamePrefix: 'sync_',
      groupAttribute: 'member_of',
      groupMapping:   { 'ops-group-id': 'admin' },
    },
  });
  return { stack, lambda };
}

describe('SignInSyncLambda', () => {
  it('runs for 5 seconds with 256 MB', () => {
    const { stack } = newSignInSyncLambda();

    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', { Timeout: 5, MemorySize: 256 });
  });

  it('gets the admin groups, the username prefix, the full attribute name and the group mapping from its props', () => {
    const { stack } = newSignInSyncLambda();

    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
      Environment: {
        Variables: Match.objectLike({
          ADMIN_GROUPS:     '["admin"]',
          USER_NAME_PREFIX: 'sync_',
          GROUP_ATTRIBUTE:  'custom:member_of',
          GROUP_MAPPING:    '{"ops-group-id":"admin"}',
        }),
      },
    });
  });

  it('may add and remove users of any pool of the account from groups, and nothing else in Cognito', () => {
    const { stack } = newSignInSyncLambda();
    const template  = Template.fromStack(stack);

    for (const action of ['cognito-idp:AdminAddUserToGroup', 'cognito-idp:AdminRemoveUserFromGroup']) {
      const statements = statementsForAction(template, action);
      expect(statements).toHaveLength(1);
      expect(renderWithTokens(statements[0].Resource)).toBe('arn:<token>:cognito-idp:<token>:<token>:userpool/*');
    }
  });

  it('has no invoke permission before the pool attaches it', () => {
    const { stack } = newSignInSyncLambda();

    Template.fromStack(stack).resourceCountIs('AWS::Lambda::Permission', 0);
  });

  it('lets the pool invoke it, and only the pool, once the pool attaches it', () => {
    const { stack, lambda } = newSignInSyncLambda();

    lambda.allowInvocationFrom(UserPool.fromUserPoolArn(stack, 'user-pool', USER_POOL_ARN));

    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Permission', {
      Action:    'lambda:InvokeFunction',
      Principal: 'cognito-idp.amazonaws.com',
      SourceArn: USER_POOL_ARN,
    });
  });

  it('names the identity provisioner in its environment and grants itself invoke access to it', () => {
    const { stack, lambda } = newSignInSyncLambda();

    lambda.enableProvisioning(IDENTITY_PROVISIONER);

    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
      Environment: { Variables: Match.objectLike({ IDENTITY_PROVISIONER_FUNCTION_NAME: 'identity-provisioner' }) },
    });
    expect(IDENTITY_PROVISIONER.grantInvoke).toHaveBeenCalledWith(lambda);
  });
});
