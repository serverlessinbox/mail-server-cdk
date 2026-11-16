import type * as acm             from 'aws-cdk-lib/aws-certificatemanager';

import type { AuthClientConfig } from './core/auth/auth-provider';

/**
 * The public HTTPS URLs of the endpoints a MailServer serves. The domain is derived at deploy time,
 * so each value is an unresolved token at synth time: build on it by concatenation and do not
 * parse it. With `MailServerProps.subdomainNamespace`, each host sits under the namespace
 * (admin.<namespace>.<domain>).
 */
export interface MailServerUrls {
  /** URL of the Admin UI: `https://admin.<domainName>`. Present only when `MailServerProps.enableAdminUi` is not false. */
  readonly adminUi?: string;
  /** URL of the Webmail UI: `https://webmail.<domainName>`. Present only when `MailServerProps.enableWebmailUi` is not false. */
  readonly webmailUi?: string;
  /** URL of the JMAP API: `https://jmap.<domainName>`. */
  readonly jmapApi: string;
  /** URL of the Admin API: `https://api.<domainName>`. */
  readonly adminApi: string;
}

/**
 * The ACM certificates a MailServer created for itself. A field is undefined when the MailServer did
 * not create that certificate.
 */
export interface MailServerCertificates {
  /**
   * The us-east-1 ACM certificate for the CloudFront (edge) alternate domain names. Present only
   * when `MailServerProps.hostedZone` is set.
   */
  readonly edge?: acm.ICertificate;
  /**
   * The regional ACM SAN certificate covering the api, jmap, ws and mcp subdomains. Present only
   * when `MailServerProps.hostedZone` is set and at least one of `overrides.certificates.api` and
   * `overrides.certificates.jmap` is not supplied.
   */
  readonly regional?: acm.ICertificate;
}

/**
 * The OAuth clients a MailServer created for its UIs. A field is present only when the
 * corresponding UI is enabled.
 */
export interface OAuthClients {
  /** The Admin UI's OAuth client; present only when `MailServerProps.enableAdminUi` is not false. */
  readonly adminUi?: AuthClientConfig;
  /** The Webmail UI's OAuth client; present only when `MailServerProps.enableWebmailUi` is not false. */
  readonly webmailUi?: AuthClientConfig;
}
