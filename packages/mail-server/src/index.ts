/** The public surface of the Serverless Inbox mailbox construct library. */

// MailServer construct
export { MailServer } from './mail-server';
export type {
  MailServerProps,
  MailServerOverrides,
  CertificateOverrides,
  SubdomainOverrides,
} from './mail-server-props';
export type {
  OAuthClients,
  MailServerUrls,
  MailServerCertificates,
} from './mail-server-outputs';
export { SesReceivingMode } from './contracts/ses-receiving-mode';

// Hosted zone — looked up once by the app, passed to the constructs that need it
export { HostedZoneLookup } from './core/domains/hosted-zone-lookup';
export type { HostedZoneLookupProps } from './core/domains/hosted-zone-lookup';

// Stack-failure-detection — consent enum (referenced by MailServerProps.sendStackFailures)
export { SendStackFailuresMode } from './platform/ops/stack-failure-detection';

// Auth — types
export { AuthPolicyName, OAuthClientName } from './contracts/auth-names';
export { AuthMethod } from './core/auth/auth-method';
export { OAuthFlow } from './core/auth/oauth-flow';
export type {
  OidcProviderConfig,
  AuthPoliciesConfig,
  OAuthAuthorizationCodeClientConfig,
  OAuthClientsConfig,
} from './core/auth/auth-bootstrap-config';
export type {
  AuthPolicyConfig,
  MailServerAuthPolicies,
  OAuthClientCredentials,
  GenerateAuthorizationCodeClientParams,
  GenerateClientCredentialsClientParams,
  GenerateClientParams,
  AuthClientConfig,
  ProvisionAdminApiClientParams,
  ProvisionJmapApiClientParams,
  IAuthProviderBase,
  MailServerAuthorizationConfig,
  IAuthProvider,
} from './core/auth/auth-provider';

// Auth — JMAP scopes
export { Permission, JMAP_SCOPE_DESCRIPTIONS } from './core/auth/jmap-scopes';
export type { ScopeMap } from './core/auth/jmap-scopes';

// Admin API addons
export type { IAdminApiAddon, AdminApiRouteSpec, AdminApiAddonContext, IAdminApiAddonProvider, IJmapApiAddon, JmapApiAddonContext } from './core/apis/addons';
export type { AdminUiConfigFragment } from './core/apis/addons';
export type { IAuditEventsQueue } from './resources/queues/audit-events-queue';
export type { IIdentityProvisioner } from './resources/lambdas/identity-provisioner-lambda';
export type { IDataTable } from './resources/tables/data-tables';
export { StackUpdateAddonProvider } from './platform/update/stack-update-addon-provider';
export type { StackUpdateAddonProviderProps } from './platform/update/stack-update-addon-provider';
export { SupportMode } from './platform/support/support-addon';
export { SupportAddonProvider } from './platform/support/support-addon-provider';
export type { SupportAddonProviderProps } from './platform/support/support-addon-provider';

// Utils — tagging & correlation
export {
  ServerlessInboxTagKeys,
  applyServerlessInboxBaseTags,
  applyServerlessInboxComponentTag,
} from '@serverlessinbox/mail-server-cdk-shared';
export type {
  ServerlessInboxComponent,
  ApplyServerlessInboxTagsOptions,
} from '@serverlessinbox/mail-server-cdk-shared';

// Utils — resource-descriptions Aspect (Name tags + native descriptions for sub-stacks)
export { ResourceDescriptions } from './utils/resource-descriptions';
export type { ResourceDescriptionsOptions } from './utils/resource-descriptions';

// Utils — KMS
export { KmsMode } from './core/mail-server-kms-mode';
export { KmsResource } from './core/mail-server-kms-resource';
export type {
  KmsPerResourceConfig,
  KmsConfig,
} from './core/kms';

// Artifact resolution — the auto-updating resolver and its settings
export { AutoUpdater } from './platform/update/auto-updater';
export type { AutoUpdaterProps } from './platform/update/auto-updater';
export { Granularity } from './contracts/granularity';
export type { IUiContentDeployTarget, IUiContentUpdater } from './contracts/ui-content-updater';

