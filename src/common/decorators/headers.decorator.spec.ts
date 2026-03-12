import { vi } from 'vitest';

// Mock GqlExecutionContext before imports
vi.mock('@nestjs/graphql', async importOriginal => {
  const actual = await importOriginal<typeof import('@nestjs/graphql')>();
  return {
    ...actual,
    GqlExecutionContext: {
      create: vi.fn(),
    },
  };
});

import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Headers } from './headers.decorator';

// Helper to extract the factory function from a createParamDecorator result
function getParamDecoratorFactory(decorator: ParameterDecorator) {
  class TestClass {
    testMethod(@decorator _param: any) {}
  }

  const metadata = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    TestClass,
    'testMethod'
  );
  const key = Object.keys(metadata)[0];
  return metadata[key].factory;
}

describe('Headers decorator', () => {
  it('should return all headers when called without arguments', () => {
    const mockHeaders = {
      authorization: 'Bearer token',
      'content-type': 'application/json',
    };

    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => ({
        req: { headers: mockHeaders },
      }),
    } as any);

    const decorator = Headers();
    const factory = getParamDecoratorFactory(decorator);
    const mockContext = {};

    const result = factory(undefined, mockContext);
    expect(result).toBe(mockHeaders);
  });

  it('should return a specific header value when called with a header name', () => {
    const mockHeaders = {
      authorization: 'Bearer my-token',
      'x-custom': 'custom-value',
    };

    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => ({
        req: { headers: mockHeaders },
      }),
    } as any);

    const decorator = Headers('authorization');
    const factory = getParamDecoratorFactory(decorator);
    const mockContext = {};

    const result = factory('authorization', mockContext);
    expect(result).toBe('Bearer my-token');
  });

  it('should return undefined for a missing header', () => {
    const mockHeaders = {
      'content-type': 'application/json',
    };

    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => ({
        req: { headers: mockHeaders },
      }),
    } as any);

    const decorator = Headers('x-missing');
    const factory = getParamDecoratorFactory(decorator);
    const mockContext = {};

    const result = factory('x-missing', mockContext);
    expect(result).toBeUndefined();
  });
});
