import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { GqlExecutionContext } from '@nestjs/graphql';
import { vi } from 'vitest';
import { CurrentActor } from './current-actor.decorator';

// Extract the factory from the createParamDecorator result via metadata.
// createParamDecorator returns a factory: calling CurrentActor() returns a ParameterDecorator.
function getParamDecoratorFactory(decoratorFactory: any) {
  class TestClass {
    // biome-ignore lint/suspicious/noExplicitAny: test helper
    testMethod(@decoratorFactory() _param: any) {}
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestClass,
    'testMethod'
  );
  const key = Object.keys(metadata)[0];
  return metadata[key].factory;
}

describe('CurrentActor', () => {
  let createSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createSpy = vi.spyOn(GqlExecutionContext, 'create');
  });

  afterEach(() => {
    createSpy.mockRestore();
  });

  it('should extract user from graphql context', () => {
    const mockUser = { id: 'actor-1', email: 'test@example.com' };

    createSpy.mockReturnValue({
      getContext: () => ({
        req: { user: mockUser },
      }),
    } as any);

    const factory = getParamDecoratorFactory(CurrentActor);

    const mockContext = {
      getType: () => 'graphql',
      getClass: () => ({}),
      getHandler: () => ({}),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToHttp: () => ({} as any),
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
    } as unknown as ExecutionContext;

    const result = factory(undefined, mockContext);
    expect(result).toBe(mockUser);
  });

  it('should extract user from http context', () => {
    const mockUser = { id: 'actor-2' };
    const mockRequest = { user: mockUser };
    const mockContext = {
      getType: () => 'http',
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getClass: () => ({}),
      getHandler: () => ({}),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
    } as unknown as ExecutionContext;

    const factory = getParamDecoratorFactory(CurrentActor);
    const result = factory(undefined, mockContext);
    expect(result).toBe(mockUser);
  });

  it('should return null for unknown context types', () => {
    const mockContext = {
      getType: () => 'rpc',
      getClass: () => ({}),
      getHandler: () => ({}),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToHttp: () => ({} as any),
      switchToRpc: () => ({} as any),
      switchToWs: () => ({} as any),
    } as unknown as ExecutionContext;

    const factory = getParamDecoratorFactory(CurrentActor);
    const result = factory(undefined, mockContext);
    expect(result).toBeNull();
  });
});
