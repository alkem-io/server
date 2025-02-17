import { apmAgent } from '../apm';

export const createInstrumentMethodDecorator = (type: string) => () => {
  return (
    targetClass: any,
    methodName: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;
    descriptor.value = new Proxy(originalMethod, {
      apply(target: any, thisArg: any, argArray: any[]): any {
        if (!apmAgent.currentTransaction) {
          return Reflect.apply(target, thisArg, argArray);
        }
        // start span
        const span = apmAgent.currentTransaction.startSpan(
          methodName,
          'graphql'
          // { exitSpan: true }
        );

        if (!span) {
          return Reflect.apply(target, thisArg, argArray);
        }

        span.subtype = type;

        const func = Reflect.apply(target, thisArg, argArray);
        const isPromise = func instanceof Promise;
        const isFunction = func instanceof Function;
        // execute and measure
        if (isPromise) {
          return (func as PromiseLike<any>).then(x => {
            span.end();
            return x;
          });
        } else if (isFunction) {
          span.end();
          return Reflect.apply(func, thisArg, argArray);
        } else {
          span.end();
          return func;
        }
      },
    });

    return descriptor;
  };
};
