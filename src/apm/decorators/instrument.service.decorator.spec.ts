import { InstrumentService } from './instrument.service.decorator';

describe('InstrumentService', () => {
  it('should return a class decorator function', () => {
    const decorator = InstrumentService();
    expect(typeof decorator).toBe('function');
  });

  it('should accept skipMethods option', () => {
    const decorator = InstrumentService({ skipMethods: ['method1'] });
    expect(typeof decorator).toBe('function');
  });

  it('should apply the decorator to a class without errors', () => {
    class TestClass {
      myMethod() {
        return 'value';
      }
    }

    const decorator = InstrumentService();
    // Should not throw
    decorator(TestClass);

    const instance = new TestClass();
    expect(instance.myMethod()).toBe('value');
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
    const decorator = InstrumentService({ skipMethods: ['skip'] });
    decorator(TestClass);

    // The skipped method should remain unchanged
    expect(TestClass.prototype.skip).toBe(originalSkip);
  });
});
