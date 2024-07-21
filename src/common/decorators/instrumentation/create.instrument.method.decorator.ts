import { apm } from '@src/apm';

export const createInstrumentMethodDecorator = (type: string) => () => {
  return (
    targetClass: any,
    methodName: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value;
    descriptor.value = new Proxy(originalMethod, {
      apply(target: any, thisArg: any, argArray: any[]): any {
        const span = apm.currentTransaction.startSpan(methodName, type);
        const func = Reflect.apply(target, thisArg, argArray);
        const isPromise = func instanceof Promise;
        const isFunction = func instanceof Function;
        // start span
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
