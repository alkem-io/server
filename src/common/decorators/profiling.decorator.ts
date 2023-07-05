import { LoggerService } from '@nestjs/common';
import { performance } from 'perf_hooks';
import { LogContext } from '@common/enums';

export class Profiling {
  static logger: LoggerService;
  static profilingEnabled = false;
  static api = (
    targetObj: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    if (!Profiling.logger.verbose) {
      return descriptor;
    }

    const originalMethod = descriptor.value;
    descriptor.value = new Proxy(originalMethod, {
      apply(target: any, thisArg: any, argArray: any[]): any {
        const targetName = target.constructor.name;
        const targetObjName = targetObj.constructor.name;

        const func = Reflect.apply(target, thisArg, argArray);
        const isPromise = func instanceof Promise;
        const isFunction = func instanceof Function;

        let result;
        const start = performance.now();

        if (isPromise) {
          result = (func as PromiseLike<any>).then(x => {
            Profiling._log(start, targetName, targetObjName, propertyKey);
            return x;
          });
        } else if (isFunction) {
          result = Reflect.apply(func, thisArg, argArray);
          Profiling._log(start, targetName, targetObjName, propertyKey);
        } else {
          result = func;
          Profiling._log(start, targetName, targetObjName, propertyKey);
        }

        return result;
      },
    });

    return descriptor;
  };

  private static _log(
    start: number,
    funcType: 'Function' | 'AsyncFunction',
    name: string,
    propertyKey: string
  ): void {
    const elapsed = (performance.now() - start).toFixed(3);
    const msg = `${funcType}-${name}-${propertyKey}: Execution time: ${elapsed} milliseconds`;
    Profiling.logger.verbose?.(msg, LogContext.API);
  }
}
