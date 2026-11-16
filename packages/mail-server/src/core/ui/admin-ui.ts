import type { IArtifactResolver }          from '@serverlessinbox/artifact-registry-cdk';
import { ComponentDescription }            from '@serverlessinbox/mail-server-cdk-shared';
import * as acm                            from 'aws-cdk-lib/aws-certificatemanager';
import { Construct }                       from 'constructs';

import { AuthPolicyName, OAuthClientName } from '../../contracts/auth-names';
import type { IAuditEventsQueue }          from '../../resources/queues/audit-events-queue';
import type { IDataTable }                 from '../../resources/tables/data-tables';
import { AuthClientConfig, IAuthProvider } from '../auth/auth-provider';

import { MailServerUi }                    from './mail-server-ui';
import type { MailServerUiConfig }         from './mail-server-ui';

/** Props of {@link AdminUi}. */
export interface AdminUiProps {
  /**
   * Domain name for the CloudFront distribution (e.g., admin.example.com)
   */
  readonly domainName: string;

  /**
   * Optional ACM certificate for `domainName`.
   * When provided, the CloudFront distribution will be configured with an alternate domain name.
   */
  readonly certificate?: acm.ICertificate;

  /** Shared config table used by token exchange API. */
  readonly configTable: IDataTable;

  /** Audit events queue for admin login audit records. */
  readonly auditEventsQueue: IAuditEventsQueue;

  /** Auth provider used to provision the OAuth client for this UI. */
  readonly authProvider: IAuthProvider;

  /**
   * Content Security Policy header value
   * Generated at build time with script/style hashes
   * Example: "default-src 'none'; script-src 'self' sha256-abc123...; ..."
   * Optional - if not provided, a basic CSP will be used
   */
  readonly cspPolicy?: string;

  /** Base URL for the Admin UI's backend API. Written into `/config/config.json`. */
  readonly apiUrl: string;

  /** Webmail app URL. Written into `/config/config.json` as `webmailUrl`. */
  readonly webmailUrl?: string;

  /** Additional runtime config written into `/config/config.json` (e.g. feature flags / IdP user management config). */
  readonly uiConfig?: MailServerUiConfig;

  /** Artifact resolver for all UI resources (bundle + ui-deployer + token-exchange). */
  readonly artifactResolver: IArtifactResolver;
}

/**
 * The admin dashboard: a {@link MailServerUi} that serves the Admin UI bundle and registers the OAuth
 * client the Admin UI logs in with.
 *
 * It creates:
 * - an S3 bucket for the static UI files
 * - a CloudFront distribution in front of it, reading the bucket through Origin Access Control
 * - the OAuth token-exchange API behind `/auth/*`
 */
export class AdminUi extends MailServerUi {
  readonly oauthClient: AuthClientConfig;
  readonly oauthRedirectUri: string;

  constructor(scope: Construct, id: string, props: AdminUiProps) {
    const adminUiConfig: MailServerUiConfig = {
      ...props.uiConfig,
      apiUrl: props.apiUrl,
      ...(props.webmailUrl ? { webmailUrl: props.webmailUrl } : {}),
    };

    super(scope, id, {
      label:                    'Admin UI',
      tokenExchangeServiceName: 'idp-token-exchange-admin-ui',
      tokenExchangePipeline:    'admin',
      domainName:               props.domainName,
      certificate:              props.certificate,
      configTable:              props.configTable,
      auditEventsQueue:         props.auditEventsQueue,
      authPolicyName:           AuthPolicyName.ADMIN_API,
      oauthClientName:          OAuthClientName.ADMIN_UI,
      uiBundle:                 {
        packageName: 'mail-server-admin-ui',
        objectPath:  'admin-ui.zip',
      },
      uiConfig:         adminUiConfig,
      artifactResolver: props.artifactResolver,
    });
    ComponentDescription.describe(this, 'Admin web console — S3-hosted static site behind CloudFront with an OAuth token-exchange backend (BFF).');

    const uiHost     = this.distributionDomainName;
    this.oauthClient = props.authProvider.provisionAdminApiClient({
      name:         'admin-ui',
      callbackUrls: [`https://${uiHost}/auth/callback`],
      logoutUrls:   [`https://${uiHost}/`],
    });

    this.oauthRedirectUri = '/';
  }
}
