import { IResolvable, Stack, Tokenization } from 'aws-cdk-lib';
import { IConstruct }                       from 'constructs';

/**
 * The key under which the S3-safe name base (a CDK token or string) is stored on a stack's construct node.
 * A global symbol, so every bundled copy of this module reads the same value.
 */
const stackNameBaseKey = Symbol.for('@serverlessinbox/stack-name-base');

/**
 * Reads the name base stored on a stack's construct node; undefined when none is stored.
 */
function readStackNameBase(stackNode: IConstruct['node']): string | IResolvable | undefined {
  const value: unknown = Reflect.get(stackNode, stackNameBaseKey);
  if (typeof value === 'string' || Tokenization.isResolvable(value)) {
    return value;
  }
  return undefined;
}

/**
 * Register an S3-safe name base for a Stack.
 *
 * Setting the same stack's name base twice with different values throws an error.
 * Only call this once per stack.
 *
 * @param stack Any construct in the Stack; will be normalized to the actual Stack
 * @param nameBase The S3-safe name base (typically a derived token or string)
 * @throws Error if a different value is already registered for this stack
 */
export function setStackNameBase(stack: IConstruct, nameBase: string | IResolvable): void {
  const stackNode = Stack.of(stack).node;
  const existing  = readStackNameBase(stackNode);

  if (existing !== undefined) {
    // Registering the identical value again is allowed; any other value is rejected.
    if (existing === nameBase) {
      return;
    }

    throw new Error(
      `Stack name base already registered for ${stackNode.path}. ` +
      'Setting it twice with different values is not permitted. ' +
      `Existing: ${String(existing)}. New: ${String(nameBase)}.`
    );
  }

  Object.defineProperty(stackNode, stackNameBaseKey, {
    value:        nameBase,
    enumerable:   false,
    configurable: true,
  });
}

/**
 * Retrieve the registered S3-safe name base for a Stack, if one exists.
 *
 * Returns undefined if no name base has been registered for this stack.
 *
 * @param stack Any construct in the Stack; will be normalized to the actual Stack
 * @returns The registered name base (string or IResolvable), or undefined
 */
export function getStackNameBase(stack: IConstruct): string | IResolvable | undefined {
  return readStackNameBase(Stack.of(stack).node);
}
