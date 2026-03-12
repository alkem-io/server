import { INNOVATION_HUB_INJECT_TOKEN } from '@common/constants';
import { vi } from 'vitest';

vi.mock('@nestjs/common', async importOriginal => {
  const actual = await importOriginal<typeof import('@nestjs/common')>();
  return {
    ...actual,
    createParamDecorator: (factory: any) => {
      (globalThis as any).__innovationHubFactory = factory;
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
import './innovation.hub.decoration';

describe('InnovationHub decorator', () => {
  const getFactory = () =>
    (globalThis as any).__innovationHubFactory as (
      data: any,
      context: any
    ) => any;

  it('should extract innovation hub from graphql context', () => {
    const mockHub = { id: 'hub-1', subdomain: 'test' };

    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => ({
        [INNOVATION_HUB_INJECT_TOKEN]: mockHub,
      }),
    } as any);

    const mockContext = {};
    const result = getFactory()(undefined, mockContext);
    expect(result).toBe(mockHub);
  });

  it('should return undefined when no innovation hub is set', () => {
    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => ({
        [INNOVATION_HUB_INJECT_TOKEN]: undefined,
      }),
    } as any);

    const mockContext = {};
    const result = getFactory()(undefined, mockContext);
    expect(result).toBeUndefined();
  });
});
