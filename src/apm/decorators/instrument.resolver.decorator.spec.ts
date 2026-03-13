import 'reflect-metadata';
import { RESOLVER_NAME_METADATA } from '@nestjs/graphql';
import { InstrumentResolver } from './instrument.resolver.decorator';

describe('InstrumentResolver', () => {
  it('should return a class decorator function', () => {
    const decorator = InstrumentResolver();
    expect(typeof decorator).toBe('function');
  });

  it('should accept skipMethods option', () => {
    const decorator = InstrumentResolver({ skipMethods: ['method1'] });
    expect(typeof decorator).toBe('function');
  });

  it('should apply the decorator to a class without errors', () => {
    class TestClass {
      resolverMethod() {
        return 'value';
      }
    }
    // Mark method with resolver metadata so it gets instrumented
    Reflect.defineMetadata(
      RESOLVER_NAME_METADATA,
      'resolverMethod',
      TestClass.prototype.resolverMethod
    );

    const decorator = InstrumentResolver();
    // Should not throw
    decorator(TestClass);

    const instance = new TestClass();
    expect(instance.resolverMethod()).toBe('value');
  });

  it('should only instrument methods with resolver metadata', () => {
    class TestClass {
      resolverMethod() {
        return 'resolver';
      }
      plainMethod() {
        return 'plain';
      }
    }

    Reflect.defineMetadata(
      RESOLVER_NAME_METADATA,
      'resolverMethod',
      TestClass.prototype.resolverMethod
    );

    const originalPlain = TestClass.prototype.plainMethod;
    const decorator = InstrumentResolver();
    decorator(TestClass);

    // Plain method should remain unchanged since it has no resolver metadata
    expect(TestClass.prototype.plainMethod).toBe(originalPlain);
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

    Reflect.defineMetadata(
      RESOLVER_NAME_METADATA,
      'keep',
      TestClass.prototype.keep
    );
    Reflect.defineMetadata(
      RESOLVER_NAME_METADATA,
      'skip',
      TestClass.prototype.skip
    );

    const originalSkip = TestClass.prototype.skip;
    const decorator = InstrumentResolver({ skipMethods: ['skip'] });
    decorator(TestClass);

    expect(TestClass.prototype.skip).toBe(originalSkip);
  });
});
