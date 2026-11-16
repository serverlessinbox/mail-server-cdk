/**
 * The identity provider section of the admin UI configuration.
 */
export interface MailServerUserPoolIdpUiConfig {
  /**
   * The kind of identity provider that authenticates admin UI users. Always `cognito` for a
   * `MailServerUserPool`.
   */
  readonly type: string;
}

/**
 * The part of the admin UI's runtime configuration (`config/config.json`) that a `MailServerUserPool`
 * contributes: it tells the admin UI which identity provider its users sign in with.
 */
export interface MailServerUserPoolAdminUiConfig {
  /** The identity provider the admin UI's users sign in with. */
  readonly idp: MailServerUserPoolIdpUiConfig;
}
