import 'reflect-metadata';
import { vi } from 'vitest';
import * as apmModule from '@src/apm';
import { createInstrumentedClassDecorator } from './createInstrumentedClassDecorator';

describe('createInstrumentedClassDecorator', () => {
  const mockSpan = {
    subtype: '',
    end: vi.fn(),
  };
  const mockTransaction = {
    startSpan: vi.fn().mockReturnValue(mockSpan),
  };

  beforeEach(() => {
    mockSpan.subtype = '';
    mockSpan.end.mockClear();
    mockTransaction.startSpan.mockClear();
    mockTransaction.startSpan.mockReturnValue(mockSpan);
    Object.defineProperty(apmModule, 'apmAgent', {
      value: { currentTransaction: mockTransaction },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(apmModule, 'apmAgent', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('should instrument eligible methods on the class prototype', () => {
    class TestClass {
      myMethod() {
        return 'original';
      }
    }

    const decorator = createInstrumentedClassDecorator('service-call');
    decorator(TestClass);

    const instance = new TestClass();
    const result = instance.myMethod();

    expect(result).toBe('original');
    expect(mockTransaction.startSpan).toHaveBeenCalledWith(
      'myMethod',
      'graphql'
    );
    expect(mockSpan.subtype).toBe('service-call');
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('should not instrument when enabled is false', () => {
    class TestClass {
      myMethod() {
        return 'original';
      }
    }

    const originalMethod = TestClass.prototype.myMethod;
    const decorator = createInstrumentedClassDecorator('service-call', {
      enabled: false,
    });
    decorator(TestClass);

    expect(TestClass.prototype.myMethod).toBe(originalMethod);
  });

  it('should skip methods listed in skipMethods', () => {
    class TestClass {
      keep() {
        return 'kept';
      }
      skip() {
        return 'skipped';
      }
    }

    const originalSkip = TestClass.prototype.skip;
    const decorator = createInstrumentedClassDecorator('service-call', {
      skipMethods: ['skip'],
    });
    decorator(TestClass);

    expect(TestClass.prototype.skip).toBe(originalSkip);

    const instance = new TestClass();
    instance.keep();
    expect(mockTransaction.startSpan).toHaveBeenCalledWith('keep', 'graphql');
  });

  it('should skip the constructor', () => {
    class TestClass {
      constructor() {
        // constructor
      }
      myMethod() {
        return 'value';
      }
    }

    const decorator = createInstrumentedClassDecorator('service-call');
    decorator(TestClass);

    const instance = new TestClass();
    expect(instance).toBeInstanceOf(TestClass);
  });

  it('should skip non-function properties', () => {
    class TestClass {
      myMethod() {
        return 'value';
      }
    }

    // Add a non-function property descriptor directly to prototype
    Object.defineProperty(TestClass.prototype, 'myProp', {
      value: 'not a function',
      writable: true,
      configurable: true,
      enumerable: true,
    });

    const decorator = createInstrumentedClassDecorator('service-call');
    decorator(TestClass);

    const instance = new TestClass();
    instance.myMethod();
    expect(mockTransaction.startSpan).toHaveBeenCalledWith(
      'myMethod',
      'graphql'
    );
  });

  it('should only instrument methods with matching metadata key', () => {
    const METADATA_KEY = 'test:resolver';

    class TestClass {
      resolverMethod() {
        return 'resolver';
      }
      plainMethod() {
        return 'plain';
      }
    }

    Reflect.defineMetadata(
      METADATA_KEY,
      true,
      TestClass.prototype.resolverMethod
    );

    const originalPlain = TestClass.prototype.plainMethod;
    const decorator = createInstrumentedClassDecorator('graphql-resolver', {
      matchMethodsOnMetadataKey: METADATA_KEY,
    });
    decorator(TestClass);

    expect(TestClass.prototype.plainMethod).toBe(originalPlain);

    const instance = new TestClass();
    instance.resolverMethod();
    expect(mockTransaction.startSpan).toHaveBeenCalledWith(
      'resolverMethod',
      'graphql'
    );
  });

  it('should copy metadata from original method to instrumented method', () => {
    const SOME_KEY = 'some:metadata';

    class TestClass {
      myMethod() {
        return 'value';
      }
    }

    Reflect.defineMetadata(
      SOME_KEY,
      'some-value',
      TestClass.prototype.myMethod
    );

    const decorator = createInstrumentedClassDecorator('service-call');
    decorator(TestClass);

    expect(Reflect.getMetadata(SOME_KEY, TestClass.prototype.myMethod)).toBe(
      'some-value'
    );
  });

  it('should use default options when none provided', () => {
    class TestClass {
      myMethod() {
        return 'value';
      }
    }

    const decorator = createInstrumentedClassDecorator('service-call');
    decorator(TestClass);

    const instance = new TestClass();
    instance.myMethod();
    expect(mockTransaction.startSpan).toHaveBeenCalled();
  });
});
