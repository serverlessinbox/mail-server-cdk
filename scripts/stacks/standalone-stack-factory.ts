import { App, BootstraplessSynthesizer, type Environment, type StackProps } from 'aws-cdk-lib';

import { DataStack }                                                        from '../../packages/mail-server/src/core/data/mail-server-data-stack';
import { EdgeStack }                                                        from '../../packages/mail-server/src/core/edge/mail-server-edge-stack';
import { MailboxCognitoDataStack }                                          from '../../packages/mailbox-cognito/src/data-stack/mailbox-cognito-data-stack';

/**
 * Creates the standalone data, edge and cognito-data stacks with the ids, environments and synthesizer
 * that every consumer must share. The consumer supplies its own id prefix and environments, so the
 * factory names no consumer. The caller owns the `App`, since each consumer decides how many it makes.
 */
export class StandaloneStackFactory {
  private static readonly EDGE_REGION = 'us-east-1';

  constructor(
    private readonly idPrefix: string,
    private readonly dataEnvironment: Environment | undefined,
    private readonly cognitoDataEnvironment: Environment | undefined,
  ) {}

  createDataStack(app: App): DataStack {
    return new DataStack(app, `${this.idPrefix}Data`, this.stackProps(this.dataEnvironment));
  }

  /** The edge stack is always in us-east-1. It carries no account, so its account stays unresolved. */
  createEdgeStack(app: App): EdgeStack {
    const edgeEnvironment: Environment = {
      region: StandaloneStackFactory.EDGE_REGION,
    };
    return new EdgeStack(app, `${this.idPrefix}Edge`, this.stackProps(edgeEnvironment));
  }

  /** An undefined environment leaves the stack environment-agnostic, so its account and region stay unresolved. */
  createCognitoDataStack(app: App): MailboxCognitoDataStack {
    return new MailboxCognitoDataStack(app, `${this.idPrefix}CognitoData`, this.stackProps(this.cognitoDataEnvironment));
  }

  private stackProps(environment: Environment | undefined): StackProps {
    const synthesizer = new BootstraplessSynthesizer();
    return environment === undefined ? { synthesizer } : { env: environment, synthesizer };
  }
}
