/**
 * @serverlessinbox/mail-server-cognito - CDK Construct Library for Cognito-backed MailServer Auth
 */

// Auth — user pool construct
export { MailServerUserPool } from './user-pool/mail-server-user-pool';
export { DynamicClientRegistrationMode } from './user-pool/dynamic-client-registration-mode';
export { MfaMode } from './user-pool/mfa-mode';
export { UserPoolAudience } from './user-pool/user-pool-audience';
export type {
  MailServerUserPoolAdminUiConfig,
  MailServerUserPoolIdpUiConfig,
} from './user-pool/mail-server-user-pool-admin-ui-config';
export type {
  MailServerUserPoolProps,
  MailServerUserPoolDomainConfig,
  MailServerUserPoolCognitoDomain,
  MailServerUserPoolCognitoAutoDomain,
  MailServerUserPoolCustomDomain,
  MailServerUserPoolAuthorizationConfig,
  ProvisionHeadlessClientConfig,
  BootstrapUserConfig,
  IBootstrapUserHandle,
} from './user-pool/mail-server-user-pool';
export type {
  IMailServerUserPoolExtension,
  MailServerUserPoolExtensionContext,
  MailServerUserPoolExtensionRegistration,
  SignInSyncRule,
} from './user-pool/user-pool-extension';



// API — Cognito IdP users admin API addon
export type {
  ICognitoIdpUsersPoolConfig,
} from './cognito-idp-users-pool-config';


// Artifacts
export { COGNITO_ARTIFACT_PACKAGE } from './cognito-artifact-package';
