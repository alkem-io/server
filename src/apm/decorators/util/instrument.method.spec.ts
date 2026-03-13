import * as apmModule from '@src/apm';
import { vi } from 'vitest';
import { instrumentMethod } from './instrument.method';

describe('instrumentMethod', () => {
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
    // Override the apmAgent export for testing by using Object.defineProperty
    Object.defineProperty(apmModule, 'apmAgent', {
      value: { currentTransaction: mockTransaction },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    // Reset apmAgent to undefined (the default when APM_ENDPOINT is not set)
    Object.defineProperty(apmModule, 'apmAgent', {
      value: undefined,
      writable: true,
      configurable: true,
    });
  });

  it('should create a span and end it for synchronous return values', () => {
    const original = vi.fn().mockReturnValue('result');
    const instrumented = instrumentMethod(original, 'myMethod', 'service-call');

    const result = instrumented();

    expect(result).toBe('result');
    expect(mockTransaction.startSpan).toHaveBeenCalledWith(
      'myMethod',
      'graphql'
    );
    expect(mockSpan.subtype).toBe('service-call');
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('should end span after Promise resolves', async () => {
    const original = vi.fn().mockResolvedValue('async-result');
    const instrumented = instrumentMethod(
      original,
      'asyncMethod',
      'graphql-resolver'
    );

    const result = await instrumented();

    expect(result).toBe('async-result');
    expect(mockSpan.end).toHaveBeenCalled();
  });

  it('should call the original method without span when no active transaction', () => {
    Object.defineProperty(apmModule, 'apmAgent', {
      value: { currentTransaction: null },
      writable: true,
      configurable: true,
    });

    const original = vi.fn().mockReturnValue('no-tx');
    const instrumented = instrumentMethod(
      original,
      'noTxMethod',
      'service-call'
    );

    const result = instrumented();

    expect(result).toBe('no-tx');
    expect(mockTransaction.startSpan).not.toHaveBeenCalled();
  });

  it('should call the original method without span when startSpan returns null', () => {
    mockTransaction.startSpan.mockReturnValue(null);
    const original = vi.fn().mockReturnValue('no-span');
    const instrumented = instrumentMethod(
      original,
      'noSpanMethod',
      'service-call'
    );

    const result = instrumented();

    expect(result).toBe('no-span');
    expect(mockSpan.end).not.toHaveBeenCalled();
  });

  it('should handle function return values by ending span and calling the function', () => {
    const innerFn = vi.fn().mockReturnValue('inner-result');
    const returnedFunction = Object.assign(function (
      this: any,
      ...args: any[]
    ) {
      return innerFn(...args);
    });
    const original = vi.fn().mockReturnValue(returnedFunction);
    const instrumented = instrumentMethod(original, 'fnMethod', 'service-call');

    const result = instrumented();

    expect(mockSpan.end).toHaveBeenCalled();
    expect(result).toBe('inner-result');
  });
});
