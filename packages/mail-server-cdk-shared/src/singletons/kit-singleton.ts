import type { IConstruct }  from 'constructs';

import { KitSingletonKind } from './kit-singleton-kind';

/**
 * Marks a construct as the one once-per-stack instance of a kit class, and recognises that mark. The kit is
 * inlined into every published package, so an `instanceof` check fails across copies of a class; the mark is
 * a global symbol on the construct, which every copy reads the same way.
 */
export class KitSingleton {
  private static readonly kindKey = Symbol.for('@serverlessinbox/kit-singleton');

  /** Records `kind` on `construct` under the global symbol. */
  public static mark(construct: IConstruct, kind: KitSingletonKind): void {
    Object.defineProperty(construct, KitSingleton.kindKey, {
      value:        kind,
      enumerable:   false,
      configurable: true,
    });
  }

  /** True when `candidate` carries the mark of `kind`; `undefined` and unmarked constructs do not match. */
  public static isKind<T extends IConstruct>(candidate: IConstruct | undefined, kind: KitSingletonKind): candidate is T {
    if (candidate === undefined) {
      return false;
    }
    const marked: unknown = Reflect.get(candidate, KitSingleton.kindKey);
    return marked === kind;
  }
}
