import type * as kms        from 'aws-cdk-lib/aws-kms';

import type { KmsMode }     from './mail-server-kms-mode';
import type { KmsResource } from './mail-server-kms-resource';

/**
 * The key of each resource type, for when the types do not share {@link KmsConfig.key}. A
 * key left out falls back to {@link KmsConfig.key}.
 */
export interface KmsPerResourceConfig {
  /** Key for the S3 blob store that holds the email content. */
  readonly blobStore?: kms.IKey;
  /** Key for the DynamoDB tables. */
  readonly dynamoTables?: kms.IKey;
  /** Key for the SQS queues. */
  readonly queues?: kms.IKey;
}

/**
 * Settings for the at-rest encryption of the Mailbox's core resources: the DynamoDB tables, the
 * SQS queues and the S3 blob store. Without any setting, everything uses AWS-managed encryption.
 */
export interface KmsConfig {
  /**
   * Which keys encrypt the resources. `KmsMode.NONE` is `KmsMode.AWS_MANAGED` with every
   * excludable resource excluded: DynamoDB tables use the default AWS-owned encryption, queues are
   * unencrypted and the blob store keeps S3-managed encryption.
   *
   * @default KmsMode.AWS_MANAGED
   */
  readonly mode?: KmsMode;

  /**
   * Resources to take out of KMS encryption. A DynamoDB table then uses the default AWS-owned
   * encryption and a queue is unencrypted. For example, `{ mode: KmsMode.AWS_MANAGED,
   * excluded: [KmsResource.DYNAMODB] }` keeps DynamoDB on default encryption while the queues
   * stay KMS-encrypted.
   *
   * @default - no resource is excluded
   */
  readonly excluded?: KmsResource[];

  /**
   * One regional key for every resource type that has no key in `perResource`. Used only when
   * `mode` is `KmsMode.CUSTOMER_MANAGED`.
   *
   * @default - each resource type needs its key in `perResource`
   */
  readonly key?: kms.IKey;

  /**
   * Keys per resource type, taking precedence over `key`. Used only when `mode` is
   * `KmsMode.CUSTOMER_MANAGED`.
   *
   * @default - every resource type uses `key`
   */
  readonly perResource?: KmsPerResourceConfig;
}
