import { Logger } from '@nestjs/common';
import { performance } from 'perf_hooks';

export class Measure {
  static logger: Logger;
  static api = (
    // eslint-disable-next-line @typescript-eslint/ban-types
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args: any) {
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      const finish = performance.now();
      const elapsed = (finish - start).toFixed(3);
      const msg = `${target.constructor.name}-${propertyKey}: Execution time: ${elapsed} milliseconds`;
      Measure.logger.verbose(msg, 'P');

      return result;
    };

    return descriptor;
  };
}
