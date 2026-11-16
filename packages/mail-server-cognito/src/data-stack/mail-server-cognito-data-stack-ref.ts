import * as cognito  from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

/** The outputs of the deployed cognito data stack, as the CloudFormation attribute tokens of its deployer. */
export interface CognitoDataStackRefProps {
  readonly userPoolArn: string;
  readonly oauthDomain: string;
}

/**
 * Wraps CloudFormation output values from CognitoDataStack into typed CDK constructs.
 * All props are CF token strings passed from resource.getAttString() — no synthesis-time resolution.
 */
export class CognitoDataStackRef extends Construct {
  public readonly userPool: cognito.IUserPool;
  public readonly oauthDomain: string;

  constructor(scope: Construct, id: string, props: CognitoDataStackRefProps) {
    super(scope, id);

    this.userPool    = cognito.UserPool.fromUserPoolArn(this, 'user-pool', props.userPoolArn);
    this.oauthDomain = props.oauthDomain;
  }
}
