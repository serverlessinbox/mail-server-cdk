import type { IArtifactResolver }                                               from '@serverlessinbox/artifact-registry-cdk';
import { ArtifactObject, DeployedStack, DeployerInfra,
  serverlessInboxSubStackTags }                                                 from '@serverlessinbox/mail-server-cdk-shared';
import type { RootStack, ServerlessInboxDeployerType }                          from '@serverlessinbox/mail-server-cdk-shared';
import { Aws, Stack }                                                           from 'aws-cdk-lib';
import { Construct }                                                            from 'constructs';

import { COGNITO_ARTIFACT_PACKAGE }                                             from '../cognito-artifact-package';
import { CognitoDataDeployerWorkerLambda }                                      from '../resources/lambdas/cognito-data-deployer-worker-lambda';
import type { MfaMode }                                                         from '../user-pool/mfa-mode';

import {
  COGNITO_DATA_STACK_TEMPLATE_OBJECT,
  COGNITO_DEPLOYED_STACK_NAME,
  DEFAULT_MFA_MODE,
  DEFAULT_PASSWORD_MIN_LENGTH,
  type CognitoDataStackParameters,
}                                                                               from './mail-server-cognito-data-stack-contract';
import { cognitoDataStackName }                                                 from './mail-server-cognito-data-stack-name';
import { CognitoDataStackRef }                                                  from './mail-server-cognito-data-stack-ref';

/** The custom domain the OAuth endpoint of the cognito data stack is served from. */
export interface CognitoDataDeployerCustomDomain {
  /** Custom domain name for the Cognito OAuth endpoint. */
  readonly domainName: string;
  /** ACM certificate ARN in us-east-1 for the custom domain. */
  readonly certificateArn: string;
}

/** What `CognitoDataDeployer` needs to name, parameterise, tag and grant the deployment of the cognito data stack. */
export interface CognitoDataDeployerProps {
  /** The Cognito user pool managed domain prefix (must be globally unique across AWS). */
  readonly cognitoDomainPrefix: string;
  /** Optional custom domain. When set, overrides the managed domain for the OAuth endpoint. */
  readonly customDomain?: CognitoDataDeployerCustomDomain;
  /** MFA enforcement mode. @default MfaMode.OPTIONAL */
  readonly mfaMode?: MfaMode;
  /** Minimum password length (6–99). @default 8 */
  readonly passwordMinLength?: number;
  /** Resolver for artifact locations (threaded from parent MailServerUserPool). */
  readonly artifactResolver: IArtifactResolver;
  /** Deployment mechanism label, resolved once by the composition root and threaded down for tagging. */
  readonly deployerType: ServerlessInboxDeployerType;
  /** The root stack (name and guid), resolved once by the composition root and threaded down for tagging and the worker's grants. */
  readonly rootStack: RootStack;
  /** ARN of the sign-in sync Lambda the pool's post-confirmation and post-authentication triggers invoke. Unset: the pool gets no triggers and no sync attribute. */
  readonly signInSyncLambdaArn?: string;
  /** Short name of the custom attribute that carries a user's group values; the data stack declares it as `custom:<name>`. Set together with `signInSyncLambdaArn`. */
  readonly signInSyncAttributeName?: string;
}

/**
 * Deploys the CognitoDataStack (Cognito User Pool + OAuth domain + resource server)
 * via a CloudFormation custom resource backed by a Step Functions workflow.
 *
 * The cognito data stack is deployed in the same region as the parent stack. The custom resource sets
 * `preserveOnDelete`: removing it never deletes the cognito data stack.
 */
export class CognitoDataDeployer extends Construct {
  public readonly dataStackRef: CognitoDataStackRef;

  constructor(scope: Construct, id: string, props: CognitoDataDeployerProps) {
    super(scope, id);

    const artifacts        = props.artifactResolver;
    const stackName        = cognitoDataStackName();
    const cognitoDataStack = new DeployedStack(Stack.of(this).formatArn({
      service:      'cloudformation',
      partition:    Aws.PARTITION,
      region:       Aws.REGION,
      account:      Aws.ACCOUNT_ID,
      resource:     'stack',
      resourceName: `${stackName}/*`,
    }));

    const deployerInfra = new DeployerInfra(this, 'infra', {
      artifactResolver:       artifacts,
      stateMachineNamePrefix: 'mailbox-cognito-data-deployer-',
      deployedStackName:      COGNITO_DEPLOYED_STACK_NAME,
      deployedStack:          cognitoDataStack,
      createWorker:           (workerScope: Construct, workerId: string) => new CognitoDataDeployerWorkerLambda(workerScope, workerId, {
        artifactResolver: artifacts,
        template:         new ArtifactObject(artifacts, COGNITO_ARTIFACT_PACKAGE, COGNITO_DATA_STACK_TEMPLATE_OBJECT),
        deployedStack:    cognitoDataStack,
        rootStack:        props.rootStack,
      }),
    });

    const resource = deployerInfra.deployStack(this, 'resource', 'Custom::MailboxCognitoDataDeployer', {
      region:           Aws.REGION,
      preserveOnDelete: true,
      stackName,
      templateUrl: artifacts.getUrl(COGNITO_ARTIFACT_PACKAGE, COGNITO_DATA_STACK_TEMPLATE_OBJECT),
      parameters:  this.templateParameters(props),
      tags:        serverlessInboxSubStackTags({
        rootStack:   props.rootStack.name,
        rootStackId: props.rootStack.id,
        stack:       stackName,
      }),
    });

    this.dataStackRef = new CognitoDataStackRef(this, 'ref', {
      userPoolArn: resource.getAttString('userPoolArn'),
      oauthDomain: resource.getAttString('oauthDomain'),
    });
  }

  private templateParameters(props: CognitoDataDeployerProps): CognitoDataStackParameters {
    return {
      cognitoDomainPrefix: props.cognitoDomainPrefix,
      mfaMode:             props.mfaMode ?? DEFAULT_MFA_MODE,
      passwordMinLength:   String(props.passwordMinLength ?? DEFAULT_PASSWORD_MIN_LENGTH),
      rootStack:           props.rootStack.name,
      rootStackId:         props.rootStack.id,
      deployerType:        props.deployerType,
      ...(props.customDomain !== undefined
        ? {
          customDomainName:    props.customDomain.domainName,
          customDomainCertArn: props.customDomain.certificateArn,
        }
        : {}),
      ...(props.signInSyncLambdaArn !== undefined
        ? { signInSyncLambdaArn: props.signInSyncLambdaArn }
        : {}),
      ...(props.signInSyncAttributeName !== undefined
        ? { signInSyncAttributeName: props.signInSyncAttributeName }
        : {}),
    };
  }
}
