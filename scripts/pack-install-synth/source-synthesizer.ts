import { Template }                         from 'aws-cdk-lib/assertions';
import * as cdk                             from 'aws-cdk-lib';

import * as mailbox                         from '../../packages/mail-server/src/index';
import * as cognito                         from '../../packages/mailbox-cognito/src/index';
import type { FrozenProcessValues }         from '../template-baseline/frozen-process-values';
import { parseJsonObject, type JsonObject } from '../utils/json-value';

import { build }                            from './fixtures/consumer-stack';

/**
 * Synthesizes the example consumer stack from the packages as they are in this repository. It is the
 * reference side of the packed-package check; it judges nothing, and it does not clean up after itself.
 */
export class SourceSynthesizer {
  constructor(private readonly frozenValues: FrozenProcessValues) {}

  synthesize(): JsonObject {
    return this.frozenValues.run(() => {
      const stack = build({ cdk, mailbox, cognito });
      return parseJsonObject(JSON.stringify(Template.fromStack(stack).toJSON()), 'Synthesized template of consumer-stack');
    });
  }
}
