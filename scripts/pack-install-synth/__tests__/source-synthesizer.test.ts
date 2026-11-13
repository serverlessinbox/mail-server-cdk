import { Template }            from 'aws-cdk-lib/assertions';

import { FrozenProcessValues } from '../../template-baseline/frozen-process-values';
import { SourceSynthesizer }   from '../source-synthesizer';

/**
 * Pins that the source side of the packed-package check synthesizes the example consumer stack
 * from the repository packages, and that the result is repeatable under frozen clock and random
 * values: the packed side is compared against it, so a non-repeatable source would fail the check.
 */
describe('SourceSynthesizer', () => {
  const synthesizer = new SourceSynthesizer(new FrozenProcessValues(1_700_000_000_000, 0.5));

  it('synthesizes one MailboxCognitoDataDeployer and one MailboxDataDeployer custom resource', () => {
    const template = Template.fromJSON(synthesizer.synthesize());

    template.resourceCountIs('Custom::MailboxCognitoDataDeployer', 1);
    template.resourceCountIs('Custom::MailboxDataDeployer', 1);
  });

  it('returns the same template on every run', () => {
    expect(synthesizer.synthesize()).toEqual(synthesizer.synthesize());
  });
});
