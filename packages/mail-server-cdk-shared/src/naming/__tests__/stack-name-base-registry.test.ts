import * as cdk                               from 'aws-cdk-lib';
import { BootstraplessSynthesizer }           from 'aws-cdk-lib';

import { setStackNameBase, getStackNameBase } from '../stack-name-base-registry';

/**
 * Pins the per-stack name-base registry: one value per stack, the identical value may be registered
 * again, a different one is rejected. A silently replaced base would give resources of one stack
 * two different name bases.
 */
function newStack(): cdk.Stack {
  return new cdk.Stack(new cdk.App(), 'TestStack', {
    env:         { account: '123456789012', region: 'us-west-2' },
    synthesizer: new BootstraplessSynthesizer(),
  });
}

describe('Stack Name Base Registry', () => {
  describe('setStackNameBase and getStackNameBase', () => {
    it('returns the value set for that stack', () => {
      const stack = newStack();

      setStackNameBase(stack, 'test-base-value');

      expect(getStackNameBase(stack)).toBe('test-base-value');
    });

    it('returns undefined when no name base is registered', () => {
      expect(getStackNameBase(newStack())).toBeUndefined();
    });

    it('throws when setting a different value twice', () => {
      const stack = newStack();

      setStackNameBase(stack, 'value1');

      expect(() => setStackNameBase(stack, 'value2')).toThrow(/Stack name base already registered/);
    });

    it('allows setting the same value twice', () => {
      const stack = newStack();

      setStackNameBase(stack, 'test-value');
      setStackNameBase(stack, 'test-value');

      expect(getStackNameBase(stack)).toBe('test-value');
    });

    it('handles tokens as name base', () => {
      const stack = newStack();
      const token = cdk.Fn.getAtt('SomeResource', 'Value');

      setStackNameBase(stack, token);

      expect(getStackNameBase(stack)).toBe(token);
    });
  });

  describe('a second copy of the module', () => {
    it('reads the name base set by the first copy on the same stack', () => {
      const stack = newStack();

      setStackNameBase(stack, 'first-copy-value');

      jest.isolateModules(() => {
        const secondCopy = jest.requireActual<typeof import('../stack-name-base-registry')>('../stack-name-base-registry');

        expect(secondCopy.getStackNameBase(stack)).toBe('first-copy-value');
      });
    });

    it('throws when it sets a different value than the first copy registered', () => {
      const stack = newStack();

      setStackNameBase(stack, 'first-copy-value');

      jest.isolateModules(() => {
        const secondCopy = jest.requireActual<typeof import('../stack-name-base-registry')>('../stack-name-base-registry');

        expect(() => secondCopy.setStackNameBase(stack, 'second-copy-value'))
          .toThrow(/Stack name base already registered/);
      });
    });
  });

});
