import { vi } from 'vitest';
import { Profiling } from './profiling.decorator';

describe('Profiling', () => {
  beforeEach(() => {
    Profiling.profilingEnabled = false;
    Profiling.logger = {
      verbose: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      log: vi.fn(),
    };
  });

  describe('api decorator', () => {
    it('should return descriptor unchanged when logger.verbose is not available', () => {
      Profiling.logger = {} as any;

      const descriptor: PropertyDescriptor = {
        value: vi.fn(),
        writable: true,
        enumerable: false,
        configurable: true,
      };

      const result = Profiling.api({}, 'testMethod', descriptor);
      expect(result).toBe(descriptor);
    });

    it('should wrap the original method with a Proxy for sync return', () => {
      const originalMethod = () => 42;

      const descriptor: PropertyDescriptor = {
        value: originalMethod,
        writable: true,
        enumerable: false,
        configurable: true,
      };

      const result = Profiling.api(
        { constructor: { name: 'TestClass' } },
        'testMethod',
        descriptor
      );

      expect(result).toBeDefined();
      expect(result!.value).not.toBe(originalMethod);
    });

    it('should call the original method and return its result for sync values', () => {
      const originalMethod = () => 'sync-result';

      const descriptor: PropertyDescriptor = {
        value: originalMethod,
        writable: true,
        enumerable: false,
        configurable: true,
      };

      Profiling.api(
        { constructor: { name: 'TestClass' } },
        'testMethod',
        descriptor
      );

      const result = descriptor.value();
      expect(result).toBe('sync-result');
      expect(Profiling.logger.verbose).toHaveBeenCalled();
    });

    it('should handle async methods and log after resolution', async () => {
      const originalMethod = () => Promise.resolve('async-result');

      const descriptor: PropertyDescriptor = {
        value: originalMethod,
        writable: true,
        enumerable: false,
        configurable: true,
      };

      Profiling.api(
        { constructor: { name: 'TestClass' } },
        'asyncMethod',
        descriptor
      );

      const result = await descriptor.value();
      expect(result).toBe('async-result');
      expect(Profiling.logger.verbose).toHaveBeenCalled();
    });

    it('should log execution time with correct format', () => {
      const originalMethod = () => 'value';

      const descriptor: PropertyDescriptor = {
        value: originalMethod,
        writable: true,
        enumerable: false,
        configurable: true,
      };

      Profiling.api(
        { constructor: { name: 'TestClass' } },
        'myMethod',
        descriptor
      );

      descriptor.value();

      expect(Profiling.logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('Execution time:'),
        expect.any(String)
      );
    });

    it('should log with milliseconds suffix', () => {
      const originalMethod = () => null;

      const descriptor: PropertyDescriptor = {
        value: originalMethod,
        writable: true,
        enumerable: false,
        configurable: true,
      };

      Profiling.api(
        { constructor: { name: 'TestClass' } },
        'method',
        descriptor
      );

      descriptor.value();

      expect(Profiling.logger.verbose).toHaveBeenCalledWith(
        expect.stringContaining('milliseconds'),
        expect.any(String)
      );
    });
  });
});
