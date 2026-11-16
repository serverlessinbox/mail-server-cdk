import type { IArtifactResolver }    from '@serverlessinbox/artifact-registry-cdk';
import { TypeScriptLambda }          from '@serverlessinbox/mail-server-cdk-shared';
import type { IIdentityProvisioner } from '@serverlessinbox/mailbox';
import type { IUserPool }            from 'aws-cdk-lib/aws-cognito';
import * as iam                      from 'aws-cdk-lib/aws-iam';
import { Aws, Duration }             from 'aws-cdk-lib';
import { Construct }                 from 'constructs';

import { COGNITO_ARTIFACT_PACKAGE }  from '../../cognito-artifact-package';
import type { SignInSyncRule }       from '../../user-pool/user-pool-extension';

/** What `SignInSyncLambda` needs to resolve its code and to apply the rule of the extension that declares it. */
export interface SignInSyncLambdaProps {
  readonly artifactResolver: IArtifactResolver;
  readonly adminGroups:      string[];
  readonly rule:             SignInSyncRule;
}

/**
 * The Lambda behind the post-sign-in triggers of the user pool. It provisions the mailbox account of a user and
 * keeps the native groups of the user in step with the rule of the extension that declares it.
 */
export class SignInSyncLambda extends TypeScriptLambda {
  constructor(scope: Construct, id: string, props: SignInSyncLambdaProps) {
    super(scope, id, {
      lambdaId:         'cognito-sign-in-sync',
      pipeline:         'jmap',
      artifactResolver: props.artifactResolver,
      packageName:      COGNITO_ARTIFACT_PACKAGE,
      timeout:          Duration.seconds(5),
      memorySize:       256,
      environment:      {
        ADMIN_GROUPS:     JSON.stringify(props.adminGroups),
        USER_NAME_PREFIX: props.rule.userNamePrefix,
        GROUP_ATTRIBUTE:  `custom:${props.rule.groupAttribute}`,
        GROUP_MAPPING:    JSON.stringify(props.rule.groupMapping),
      },
    });

    this.grantAdminGroupMembership();
  }

  /** Lets the user pool invoke this function on its sign-in triggers. The permission names the one pool. */
  public allowInvocationFrom(userPool: IUserPool): void {
    this.addPermission('cognito-invoke', {
      principal: new iam.ServicePrincipal('cognito-idp.amazonaws.com'),
      sourceArn: userPool.userPoolArn,
    });
  }

  /** Points this function at the identity provisioner it invokes, and grants the invoke. */
  public enableProvisioning(provisioner: IIdentityProvisioner): void {
    this.addEnvironment('IDENTITY_PROVISIONER_FUNCTION_NAME', provisioner.functionName);
    provisioner.grantInvoke(this);
  }

  // The user pool is built after this function, and a reference to it would close a dependency cycle, so the
  // resource names every user pool of the account. A compromised function can change group membership in any of them.
  private grantAdminGroupMembership(): void {
    this.addToRolePolicy(new iam.PolicyStatement({
      actions:   ['cognito-idp:AdminAddUserToGroup', 'cognito-idp:AdminRemoveUserFromGroup'],
      resources: [`arn:${Aws.PARTITION}:cognito-idp:${Aws.REGION}:${Aws.ACCOUNT_ID}:userpool/*`],
    }));
  }
}
