import { instrumentMethod } from './instrument.method';
import { copyMetadata } from './copy.metadata';

export const createInstrumentedClassDecorator = (
  spanType: string,
  options?: {
    /** match methods on this metadata key; useful when you want to skip methods that are not actual resolvers */
    matchMethodsOnMetadataKey?: string;
    /** do not instrument these methods; useful for excluding methods from the tracing that are called many times */
    skipMethods?: string[];
  }
): ClassDecorator => {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Function) => {
    const { matchMethodsOnMetadataKey, skipMethods = [] } = options ?? {};
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
