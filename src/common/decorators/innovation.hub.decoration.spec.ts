import { INNOVATION_HUB_INJECT_TOKEN } from '@common/constants';
import { ExecutionContext } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { GqlExecutionContext } from '@nestjs/graphql';
import { vi } from 'vitest';
import { InnovationHub } from './innovation.hub.decoration';

// Extract the factory from the createParamDecorator result via metadata.
// createParamDecorator returns a factory: calling InnovationHub() returns a ParameterDecorator.
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

describe('InnovationHub decorator', () => {
  let createSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    createSpy = vi.spyOn(GqlExecutionContext, 'create');
  });

  afterEach(() => {
    createSpy.mockRestore();
  });

  it('should extract innovation hub from graphql context', () => {
    const mockHub = { id: 'hub-1', subdomain: 'test' };

    createSpy.mockReturnValue({
      getContext: () => ({
        [INNOVATION_HUB_INJECT_TOKEN]: mockHub,
      }),
    } as any);

    const factory = getParamDecoratorFactory(InnovationHub);

    const mockContext = {
      getType: () => 'graphql',
      getClass: () => ({}),
      getHandler: () => ({}),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToHttp: () => ({}) as any,
      switchToRpc: () => ({}) as any,
      switchToWs: () => ({}) as any,
    } as unknown as ExecutionContext;

    const result = factory(undefined, mockContext);
    expect(result).toBe(mockHub);
  });

  it('should return undefined when no innovation hub is set', () => {
    createSpy.mockReturnValue({
      getContext: () => ({
        [INNOVATION_HUB_INJECT_TOKEN]: undefined,
      }),
    } as any);

    const factory = getParamDecoratorFactory(InnovationHub);

    const mockContext = {
      getType: () => 'graphql',
      getClass: () => ({}),
      getHandler: () => ({}),
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToHttp: () => ({}) as any,
      switchToRpc: () => ({}) as any,
      switchToWs: () => ({}) as any,
    } as unknown as ExecutionContext;

    const result = factory(undefined, mockContext);
    expect(result).toBeUndefined();
  });
});
