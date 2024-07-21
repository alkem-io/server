import { apm } from 'src/apm';

// eslint-disable-next-line @typescript-eslint/ban-types
export function InstrumentService(target: Function) {
  for (const methodName of Object.getOwnPropertyNames(target.prototype)) {
    const descriptor = Object.getOwnPropertyDescriptor(
      target.prototype,
      methodName
    );
    // if descriptor is not found for some reason
    if (!descriptor) {
      continue;
    }
    // skip if not a method call
    if (!(descriptor.value instanceof Function)) {
      continue;
    }

    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      if (!apm.currentTransaction) {
        return originalMethod.apply(this, args);
      }

      const span = apm.currentTransaction.startSpan(
        `${target.name}.${methodName}`,
        'service-call'
      );

      const value = originalMethod.apply(this, args);

      span.end();

      return value;
    };
    Object.defineProperty(target.prototype, methodName, descriptor);
  }
}
