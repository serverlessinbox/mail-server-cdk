import * as cdk                 from 'aws-cdk-lib';
import type { Construct }       from 'constructs';

import type { MailServerUrls }  from '../../mail-server-outputs';
import type { MailServerProps } from '../../mail-server-props';

import { MailServerDomains }    from './mail-server-domains';

/** The domain a MailServer is reachable on, and the `MailServerProps` fields that shape its names. */
export interface MailServerAddressingProps extends Pick<MailServerProps, 'subdomainNamespace' | 'overrides'> {
  /** The base domain; absent when the MailServer has no domain, which leaves it empty. */
  readonly domainName?: string;
}

/** Which UIs the MailServer serves; a disabled UI gets no URL. */
export interface MailServerEnabledUis {
  readonly adminUi:   boolean;
  readonly webmailUi: boolean;
}

/**
 * Where a `MailServer` is reachable: the condition that tells whether a subdomain namespace is set,
 * the endpoint domain names and the public URLs. Knows the domain only as a name: it holds no hosted zone, no endpoint construct and creates no DNS record.
 *
 * Creates the namespace condition directly under the scope it receives, so its id and path are
 * those of the `MailServer` itself.
 */
export class MailServerAddressing {
  private constructor(
    public readonly subdomainNamespaceCondition: cdk.CfnCondition | undefined,
    public readonly domains: MailServerDomains,
    public readonly urls: MailServerUrls,
  ) {}

  /** Resolves the names and URLs of the domain in `props`. */
  public static resolve(
    scope: Construct,
    props: MailServerAddressingProps,
    enabledUis: MailServerEnabledUis,
  ): MailServerAddressing {
    const subdomainNamespaceCondition = MailServerAddressing.createNamespaceCondition(scope, props.subdomainNamespace);

    const domains = new MailServerDomains({
      domainName:          props.domainName,
      prefix:              props.subdomainNamespace,
      subdomainOverrides:  props.overrides?.subdomains,
      prefixConditionName: subdomainNamespaceCondition?.logicalId,
    });

    return new MailServerAddressing(
      subdomainNamespaceCondition,
      domains,
      MailServerAddressing.urlsOf(domains, enabledUis),
    );
  }

  private static createNamespaceCondition(scope: Construct, subdomainNamespace: string | undefined): cdk.CfnCondition | undefined {
    if (subdomainNamespace === undefined) {
      return undefined;
    }

    return new cdk.CfnCondition(scope, 'has-subdomain-namespace', {
      expression: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(subdomainNamespace, '')),
    });
  }

  private static urlsOf(domains: MailServerDomains, enabledUis: MailServerEnabledUis): MailServerUrls {
    return {
      ...(enabledUis.adminUi ? { adminUi: `https://${domains.admin}` } : {}),
      ...(enabledUis.webmailUi ? { webmailUi: `https://${domains.webmail}` } : {}),
      jmapApi:  `https://${domains.jmap}`,
      adminApi: `https://${domains.api}`,
    };
  }
}
