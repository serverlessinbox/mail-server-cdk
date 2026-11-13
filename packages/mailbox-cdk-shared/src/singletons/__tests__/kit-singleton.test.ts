/**
 * Pins how a once-per-stack kit instance is recognised. The mark is a global symbol, so a copy of the kit
 * loaded separately recognises a construct the first copy marked. A regression that goes back to comparing
 * classes fails the second-copy case, because the copy's class is not the class that created the construct.
 */

import { App, Stack }       from 'aws-cdk-lib';
import { Construct }        from 'constructs';

import { KitSingletonKind } from '../kit-singleton-kind';
import { KitSingleton }     from '../kit-singleton';

function newConstruct(): Construct {
  return new Construct(new Stack(new App(), 'test-stack'), 'marked');
}

function isolatedKitSingleton(): typeof import('../kit-singleton') {
  const loaded: { copy?: typeof import('../kit-singleton') } = {};
  jest.isolateModules(() => {
    loaded.copy = jest.requireActual<typeof import('../kit-singleton')>('../kit-singleton');
  });
  if (loaded.copy === undefined) {
    throw new Error('the second copy of kit-singleton did not load');
  }
  return loaded.copy;
}

describe('KitSingleton', () => {
  it('matches a construct marked with the same kind', () => {
    const construct = newConstruct();

    KitSingleton.mark(construct, KitSingletonKind.PIPELINE_LOG_GROUP);

    expect(KitSingleton.isKind(construct, KitSingletonKind.PIPELINE_LOG_GROUP)).toBe(true);
  });

  it('does not match a construct marked with another kind', () => {
    const construct = newConstruct();

    KitSingleton.mark(construct, KitSingletonKind.PUBLIC_STATIC_ASSETS_BUCKET);

    expect(KitSingleton.isKind(construct, KitSingletonKind.BUCKET_AUTO_EMPTY)).toBe(false);
  });

  it('does not match an unmarked construct or undefined', () => {
    expect(KitSingleton.isKind(newConstruct(), KitSingletonKind.BUCKET_AUTO_EMPTY)).toBe(false);
    expect(KitSingleton.isKind(undefined, KitSingletonKind.BUCKET_AUTO_EMPTY)).toBe(false);
  });

  it('recognises a mark that a separately loaded copy of the kit set', () => {
    const construct = newConstruct();
    KitSingleton.mark(construct, KitSingletonKind.STATIC_CONTENT_DEPLOYER);

    const secondCopy = isolatedKitSingleton();

    expect(secondCopy.KitSingleton.isKind(construct, KitSingletonKind.STATIC_CONTENT_DEPLOYER)).toBe(true);
  });
});
