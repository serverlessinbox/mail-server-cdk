import type { IUserPool }   from 'aws-cdk-lib/aws-cognito';
import type { IDependable } from 'constructs';

/**
 * What a `MailboxUserPool` hands an identity provider when it attaches it.
 */
export interface MailboxIdentityProviderContext {
  /**
   * The user pool the provider registers itself with. The provider creates its own resources in its own
   * scope and refers to the pool through this reference.
   */
  readonly userPool: IUserPool;

  /**
   * Full name of the user-pool custom attribute that carries the federated groups of the signing-in user,
   * for example `custom:federated_groups`. A provider that maps its groups writes them to this attribute.
   */
  readonly federatedGroupsAttribute: string;
}

/**
 * An external identity system, such as a SAML or OIDC identity provider, that users of a `MailboxUserPool`
 * sign in through.
 *
 * The username the provider sends becomes the user's mailbox address, so the provider must send a username
 * its identity system guarantees to be unique per person. A username that is shared, reused or reassigned
 * lets one person's sign-in reach another person's mailbox.
 */
export interface IMailboxIdentityProvider {
  /**
   * The name the provider is registered under in the user pool. It must be unique among the providers of a
   * pool, and it is listed as a supported identity provider of every OAuth client of the pool.
   */
  readonly providerName: string;

  /**
   * Whether the identity system sends the groups its users belong to.
   */
  readonly mapsFederatedGroups: boolean;

  /**
   * Registers the provider with the pool and returns the handle every OAuth client of the pool waits for, so
   * no client is created before its provider exists. Called once, when the pool is constructed.
   */
  attach(context: MailboxIdentityProviderContext): IDependable;
}
