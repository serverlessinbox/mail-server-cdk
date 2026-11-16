import type { IArtifactResolver }                                               from '@serverlessinbox/artifact-registry-cdk';
import {
  ArtifactResolverFactory,
  ServerlessInboxTagKeys,
  applyServerlessInboxBaseTags,
  resolveDeployerType,
  resolveVendorAccountIds,
}                                                                               from '@serverlessinbox/mail-server-cdk-shared';
import type { ServerlessInboxDeployerType, VendorLink }                         from '@serverlessinbox/mail-server-cdk-shared';
import { Aws }                                                                  from 'aws-cdk-lib';
import type { Construct }                                                       from 'constructs';

import { MAIL_SERVER_ARTIFACT_PACKAGE }                                         from './contracts/mail-server-artifact-package';
import { MailServerEncryption }                                                 from './core/mail-server-encryption';
import type { MailServerEncryptionPlan }                                        from './core/mail-server-encryption';
import { loadMailServerArtifactVersions }                                       from './mail-server-artifact-versions';
import type { MailServerProps }                                                 from './mail-server-props';
import { loadMailServerRegistryRecord }                                         from './mail-server-registry-record';

/** The `MailServerProps` fields the foundation is resolved from. */
type MailServerContextProps = Pick<MailServerProps, 'artifactResolver' | 'kms'>;

/**
 * The foundation values a `MailServer` resolves once, before any section is built, and threads down
 * as props: the artifact resolver and its version, the deployer type, the vendor values and the
 * encryption plan. Resolving also tags everything under the `MailServer` with the base tags.
 */
export class MailServerContext {
  private constructor(
    public readonly artifactResolver: IArtifactResolver,
    public readonly stackVersion: string,
    public readonly deployerType: ServerlessInboxDeployerType,
    public readonly vendorLink: VendorLink,
    public readonly encryptionPlan: MailServerEncryptionPlan,
  ) {}

  /** Resolves the foundation under `scope` and applies the base tags to it. */
  public static resolve(scope: Construct, props: MailServerContextProps): MailServerContext {
    const deployerType           = resolveDeployerType(scope);
    const vendorLink: VendorLink = {
      vendorAccountIds:    resolveVendorAccountIds(scope),
      stackIdentityTagKey: ServerlessInboxTagKeys.rootStack,
    };

    // The supplied resolver wins; otherwise one is pinned from the package's baked versions,
    // overridden by CDK context.
    const artifactResolver: IArtifactResolver = props.artifactResolver
      ?? ArtifactResolverFactory.fromContext(scope, loadMailServerRegistryRecord(), loadMailServerArtifactVersions());
    const stackVersion = artifactResolver.getVersion(MAIL_SERVER_ARTIFACT_PACKAGE);

    // The MailServer is the root stack of its own deployment.
    applyServerlessInboxBaseTags(scope, { rootStack: Aws.STACK_NAME });

    return new MailServerContext(
      artifactResolver,
      stackVersion,
      deployerType,
      vendorLink,
      MailServerEncryption.plan(props.kms),
    );
  }
}
