import { vi } from 'vitest';

// Use globalThis to avoid TDZ - vi.mock is hoisted above const declarations
vi.mock('@nestjs/common', async importOriginal => {
  const actual = await importOriginal<typeof import('@nestjs/common')>();
  return {
    ...actual,
    createParamDecorator: (factory: any) => {
      (globalThis as any).__currentActorFactory = factory;
      return actual.createParamDecorator(factory);
    },
  };
});

vi.mock('@nestjs/graphql', async importOriginal => {
  const actual = await importOriginal<typeof import('@nestjs/graphql')>();
  return {
    ...actual,
    GqlExecutionContext: {
      create: vi.fn(),
    },
  };
});

import { GqlExecutionContext } from '@nestjs/graphql';
// Importing triggers createParamDecorator and captures the factory
import './current-actor.decorator';

describe('CurrentActor', () => {
  const getFactory = () =>
    (globalThis as any).__currentActorFactory as (
      data: any,
      context: any
    ) => any;

  it('should extract user from graphql context', () => {
    const mockUser = { id: 'actor-1', email: 'test@example.com' };
    const mockContext = {
      getType: () => 'graphql',
    };

    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => ({
        req: { user: mockUser },
      }),
    } as any);

    const result = getFactory()(undefined, mockContext);
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
    };

    const result = getFactory()(undefined, mockContext);
    expect(result).toBe(mockUser);
  });

  it('should return null for unknown context types', () => {
    const mockContext = {
      getType: () => 'rpc',
    };

    const result = getFactory()(undefined, mockContext);
    expect(result).toBeNull();
  });
});
