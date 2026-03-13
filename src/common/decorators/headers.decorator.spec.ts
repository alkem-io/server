import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { vi } from 'vitest';
import { Headers } from './headers.decorator';

// Instead of mocking @nestjs/graphql (which doesn't work with isolate: false),
// we spy on GqlExecutionContext.create to control its return value while
// still providing a real ExecutionContext shape so the real .create() can work.
describe('Headers decorator', () => {
  let createSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createSpy = vi.spyOn(GqlExecutionContext, 'create');
  });

  afterEach(() => {
    createSpy.mockRestore();
  });

  it('should return all headers when called without arguments', () => {
    const mockHeaders = {
      authorization: 'Bearer token',
      'content-type': 'application/json',
    };

    createSpy.mockReturnValue({
      getContext: () => ({
        req: { headers: mockHeaders },
      }),
    } as any);

    // Headers() creates and returns a ParameterDecorator.
    // We can't easily extract the internal factory from createParamDecorator,
    // but we can test by calling Headers() and verifying it creates a decorator.
    // The factory receives (data, ctx) and the Headers function passes `header` as data.
    // For a full integration test, we test via the actual GqlExecutionContext.create spy.

    // Actually, the Headers function calls createParamDecorator(factory)(header)
    // and returns a ParameterDecorator. We need to extract the factory from metadata.
    const decorator = Headers();

    // Apply decorator to extract the factory from NestJS metadata
    class TestClass {
      testMethod(@decorator _param: any) {}
    }
    const metadata = Reflect.getMetadata(
      '__routeArguments__',
      TestClass,
      'testMethod'
    );
    const key = Object.keys(metadata)[0];
    const factory = metadata[key].factory;

    // The factory receives (data, executionContext)
    // We pass a minimal ExecutionContext mock that has getType() so
    // GqlExecutionContext.create can be called
    const mockExecutionContext = {
      getType: () => 'graphql',
      getClass: () => TestClass,
      getHandler: () => TestClass.prototype.testMethod,
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToHttp: () => ({} as any),
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
    } as unknown as ExecutionContext;

    const result = factory(undefined, mockExecutionContext);
    expect(result).toBe(mockHeaders);
  });

  it('should return a specific header value when called with a header name', () => {
    const mockHeaders = {
      authorization: 'Bearer my-token',
      'x-custom': 'custom-value',
    };

    createSpy.mockReturnValue({
      getContext: () => ({
        req: { headers: mockHeaders },
      }),
    } as any);

    const decorator = Headers('authorization');

    class TestClass {
      testMethod(@decorator _param: any) {}
    }
    const metadata = Reflect.getMetadata(
      '__routeArguments__',
      TestClass,
      'testMethod'
    );
    const key = Object.keys(metadata)[0];
    const factory = metadata[key].factory;

    const mockExecutionContext = {
      getType: () => 'graphql',
      getClass: () => TestClass,
      getHandler: () => TestClass.prototype.testMethod,
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToHttp: () => ({} as any),
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
    } as unknown as ExecutionContext;

    const result = factory('authorization', mockExecutionContext);
    expect(result).toBe('Bearer my-token');
  });

  it('should return undefined for a missing header', () => {
    const mockHeaders = {
      'content-type': 'application/json',
    };

    createSpy.mockReturnValue({
      getContext: () => ({
        req: { headers: mockHeaders },
      }),
    } as any);

    const decorator = Headers('x-missing');

    class TestClass {
      testMethod(@decorator _param: any) {}
    }
    const metadata = Reflect.getMetadata(
      '__routeArguments__',
      TestClass,
      'testMethod'
    );
    const key = Object.keys(metadata)[0];
    const factory = metadata[key].factory;

    const mockExecutionContext = {
      getType: () => 'graphql',
      getClass: () => TestClass,
      getHandler: () => TestClass.prototype.testMethod,
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToHttp: () => ({} as any),
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
    } as unknown as ExecutionContext;

    const result = factory('x-missing', mockExecutionContext);
    expect(result).toBeUndefined();
  });
});
