import { Logger } from '@nestjs/common';
import { performance } from 'perf_hooks';
import { LogContexts } from './logging.contexts';

export class Profiling {
  static logger: Logger;
  static profilingEnabled = false;
  static api = (
    // eslint-disable-next-line @typescript-eslint/ban-types
    target: Object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;

    descriptor.value = function(...args: any) {
      if (!Profiling.profilingEnabled) {
        // just execute the wrapped function
        return originalMethod.apply(this, args);
      }
      // profiling is enabled
      const start = performance.now();
      const result = originalMethod.apply(this, args);
      const elapsed = (performance.now() - start).toFixed(3);
      const msg = `${target.constructor.name}-${propertyKey}: Execution time: ${elapsed} milliseconds`;
      Profiling.logger.verbose(msg, LogContexts.API);

      return result;
    };

    return descriptor;
  };
}
