/// <reference types="jest" />

/**
 * MailServer: deterministic synthesis.
 *
 * Synthesizing the same MailServer app twice must produce the same template. A value that differs between
 * runs (a clock reading, a random suffix) changes a resource property on every synth, so every deploy
 * of an unchanged app reports changes and may replace resources.
 */

import { Template }                                      from 'aws-cdk-lib/assertions';
import * as cdk                                          from 'aws-cdk-lib';
import { App, BootstraplessSynthesizer }                 from 'aws-cdk-lib';

import { MailServer }                                    from '../mail-server';

import { createMockAuthProvider, TEST_ARTIFACT_CONTEXT } from './mail-server-helpers';

function synthesizeMailServerTemplate(): string {
  const app   = new App({ context: { 'serverlessinbox:artifacts': TEST_ARTIFACT_CONTEXT } });
  const stack = new cdk.Stack(app, 'TestDeterminism', {
    env:         { account: '123456789012', region: 'us-west-2' },
    synthesizer: new BootstraplessSynthesizer(),
  });
  new MailServer(stack, 'mailbox', { authProvider: createMockAuthProvider() });
  return JSON.stringify(Template.fromStack(stack).toJSON());
}

describe('Mailbox synthesized twice', () => {
  it('produces byte-identical templates', () => {
    expect(synthesizeMailServerTemplate()).toBe(synthesizeMailServerTemplate());
  });
});
