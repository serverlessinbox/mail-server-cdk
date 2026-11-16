import type { QueueEncryptionChoice }      from '@serverlessinbox/mail-server-cdk-shared';
import { TableEncryption }                 from 'aws-cdk-lib/aws-dynamodb';

import type { BlobStoreEncryptionProps }   from '../resources/buckets/blob-store';
import type { DynamoTableEncryptionProps } from '../resources/tables/data-table-props';

import type { KmsConfig }                  from './kms';
import { KmsMode }                         from './mail-server-kms-mode';
import { KmsResource }                     from './mail-server-kms-resource';

/** How each kind of data resource is encrypted, as the resources take it: tables, blob store and queue defaults. */
export interface MailServerEncryptionPlan {
  readonly blobStore:    BlobStoreEncryptionProps;
  readonly dynamoTables: DynamoTableEncryptionProps;
  /** The encryption every queue is created with. */
  readonly queueEncryption: QueueEncryptionChoice;
}

/**
 * Turns the KMS settings of a MailServer into the encryption each resource type is created with.
 *
 * In `aws-managed` mode no key is passed on at all: the tables and the queues take their AWS-managed
 * encryption by type and the blob store takes S3-managed encryption.
 */
export class MailServerEncryption {
  /** The plan for `config`; a resource that needs a customer-managed key and has none fails the synth. */
  public static plan(config?: KmsConfig): MailServerEncryptionPlan {
    return {
      dynamoTables:    MailServerEncryption.dynamoTablesPlan(config),
      queueEncryption: MailServerEncryption.queueEncryptionPlan(config),
      blobStore:       MailServerEncryption.blobStorePlan(config),
    };
  }

  private static dynamoTablesPlan(config?: KmsConfig): DynamoTableEncryptionProps {
    if (MailServerEncryption.isExcluded(KmsResource.DYNAMODB, config)) {
      return { encryption: TableEncryption.DEFAULT };
    }

    if (MailServerEncryption.modeOf(config) === KmsMode.AWS_MANAGED) {
      return { encryption: TableEncryption.AWS_MANAGED };
    }

    const key = config?.perResource?.dynamoTables ?? config?.key;
    if (!key) {
      throw new Error("MailboxProps.kms.mode is 'customer-managed' but no DynamoDB KMS key was provided");
    }
    return { encryption: TableEncryption.CUSTOMER_MANAGED, encryptionKey: key };
  }

  private static queueEncryptionPlan(config?: KmsConfig): QueueEncryptionChoice {
    if (MailServerEncryption.isExcluded(KmsResource.SQS, config)) {
      return { kind: 'unencrypted' };
    }

    if (MailServerEncryption.modeOf(config) === KmsMode.AWS_MANAGED) {
      return { kind: 'aws-managed' };
    }

    const key = config?.perResource?.queues ?? config?.key;
    if (!key) {
      throw new Error("MailboxProps.kms.mode is 'customer-managed' but no SQS KMS key was provided");
    }
    return { kind: 'kms', key };
  }

  private static blobStorePlan(config?: KmsConfig): BlobStoreEncryptionProps {
    if (MailServerEncryption.modeOf(config) === KmsMode.AWS_MANAGED) {
      return { encryptionKey: undefined };
    }

    const key = config?.perResource?.blobStore ?? config?.key;
    if (!key) {
      throw new Error("MailboxProps.kms.mode is 'customer-managed' but no S3 KMS key was provided for the blob store");
    }
    return { encryptionKey: key };
  }

  /** The mode in force; `NONE` is `AWS_MANAGED` with every resource excluded. */
  private static modeOf(config?: KmsConfig): KmsMode {
    const mode = config?.mode ?? KmsMode.AWS_MANAGED;
    return mode === KmsMode.NONE ? KmsMode.AWS_MANAGED : mode;
  }

  private static isExcluded(resource: KmsResource, config?: KmsConfig): boolean {
    return config?.mode === KmsMode.NONE || (config?.excluded ?? []).includes(resource);
  }
}
