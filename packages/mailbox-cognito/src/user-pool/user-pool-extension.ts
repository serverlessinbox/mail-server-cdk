import type { IUserPool }   from 'aws-cdk-lib/aws-cognito';
import type { IDependable } from 'constructs';

/**
 * What a `MailboxUserPool` hands an extension when it attaches it.
 */
export interface MailboxUserPoolExtensionContext {
  /**
   * The user pool the extension registers itself with. The extension creates its resources in its own scope
   * and refers to the pool through this reference.
   */
  readonly userPool: IUserPool;
}

/**
 * What an extension returns from `attach`: the client sign-in names it contributes and the handle every OAuth
 * client of the pool waits for.
 */
export interface MailboxUserPoolExtensionRegistration {
  /**
   * Names listed on every OAuth client of the pool. Empty is allowed, for an extension whose resources do not exist yet.
   */
  readonly clientSignInProviders: string[];

  /**
   * What every OAuth client of the pool waits for, so no client is created before the extension's resources exist.
   */
  readonly dependable: IDependable;
}

/**
 * Keeps the mailbox accounts and the native groups of a pool's users in step with their sign-ins.
 *
 * The pool runs the rule after each sign-in of a user whose Cognito username starts with `userNamePrefix`, and
 * puts the user in, or takes the user out of, each pool group that the attribute value maps to.
 */
export interface SignInSyncRule {
  /**
   * Users whose Cognito username starts with this prefix.
   */
  readonly userNamePrefix: string;

  /**
   * Short name of the custom user attribute that carries the group values of a user. The full attribute name
   * is `custom:<groupAttribute>`.
   */
  readonly groupAttribute: string;

  /**
   * Maps each attribute value to the name of a pool group. A user holding a mapped value is a member of the group.
   */
  readonly groupMapping: Record<string, string>;
}

/**
 * A source of sign-ins that a `MailboxUserPool` attaches once, when it is constructed.
 *
 * A user who signs in through an extension is named after the username the extension sends, and that username
 * becomes the user's mailbox address. The extension must therefore send a username its identity system guarantees
 * to be unique per person: a username that is shared, reused or reassigned lets one person's sign-in reach another
 * person's mailbox.
 */
export interface IMailboxUserPoolExtension {
  /**
   * The rule that keeps mailbox accounts and native groups in step with sign-ins. At most one extension of a pool
   * declares it.
   */
  readonly signInSync?: SignInSyncRule;

  /**
   * Registers the extension with the pool and returns its registration. The pool calls it once per extension, in
   * the order of the pool's `extensions`, after the pool's user pool exists. The extension creates its resources in
   * its own scope against `context.userPool`.
   *
   * The extension must send a username its identity system guarantees to be unique per person; it becomes the
   * mailbox address of the user.
   */
  attach(context: MailboxUserPoolExtensionContext): MailboxUserPoolExtensionRegistration;
}
