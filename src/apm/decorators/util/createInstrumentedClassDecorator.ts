import { copyMetadata } from './copy.metadata';
import { instrumentMethod } from './instrument.method';

export type ClassDecoratorParams = {
  /**
   * Optionally disable the decorator; useful when you want to exclude some classes conditionally without removing the decorator
   * @default true
   * */
  enabled?: boolean;
  /** Tells the decorator to match methods on this metadata key; useful when you want to skip methods that are not actual resolvers */
  matchMethodsOnMetadataKey?: string;
  /** Tells the decorator to not instrument these methods; useful for excluding methods from the tracing that are called many times */
  skipMethods?: string[];
};

export const createInstrumentedClassDecorator = (
  spanType: string,
  options?: ClassDecoratorParams
): ClassDecorator => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return (target: Function) => {
    const {
      matchMethodsOnMetadataKey,
      skipMethods = [],
      enabled = true,
    } = options ?? {};

    if (!enabled) {
      return;
    }

    const descriptors = Object.getOwnPropertyDescriptors(target.prototype);
    for (const [methodName, descriptor] of Object.entries(descriptors)) {
      // skip if in skippable methods list
      if (skipMethods.includes(methodName)) {
        continue;
      }
      // skip if not a method call
      if (
        typeof descriptor.value != 'function' ||
        methodName === 'constructor'
      ) {
        continue;
      }
      // skip method that are not marked as resolvers
      if (
        matchMethodsOnMetadataKey &&
        !Reflect.getMetadataKeys(descriptor.value).includes(
          matchMethodsOnMetadataKey
        )
      ) {
        continue;
      }

      const originalMethod = descriptor.value;
      descriptor.value = instrumentMethod(originalMethod, methodName, spanType);

      if (originalMethod != descriptor.value) {
        copyMetadata(originalMethod, descriptor.value);
      }

      Object.defineProperty(target.prototype, methodName, descriptor);
    }
  };
};
