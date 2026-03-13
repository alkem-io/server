import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';
import { DATA_LOADER_CTX_INJECT_TOKEN } from '../data.loader.inject.token';
import { DataLoaderInterceptor } from './data.loader.interceptor';

describe('DataLoaderInterceptor', () => {
  let interceptor: DataLoaderInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DataLoaderInterceptor, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    interceptor = module.get(DataLoaderInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('skips non-graphql contexts and calls next.handle()', () => {
    const mockHandle = vi.fn().mockReturnValue({ pipe: vi.fn() });
    const context = {
      getType: vi.fn().mockReturnValue('http'),
    } as any;
    const next = { handle: mockHandle } as any;

    interceptor.intercept(context, next);

    expect(mockHandle).toHaveBeenCalledOnce();
  });

  it('skips when ctx.req is undefined', () => {
    const mockHandle = vi.fn().mockReturnValue({ pipe: vi.fn() });
    const context = {
      getType: vi.fn().mockReturnValue('graphql'),
      getArgs: vi.fn().mockReturnValue([]),
      getClass: vi.fn(),
      getHandler: vi.fn(),
      switchToHttp: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
    } as any;

    // Mock GqlExecutionContext.create to return context without req
    const { GqlExecutionContext } = require('@nestjs/graphql');
    vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => ({ req: undefined }),
    } as any);

    const next = { handle: mockHandle } as any;

    interceptor.intercept(context, next);

    expect(mockHandle).toHaveBeenCalledOnce();
  });

  it('injects DATA_LOADER_CTX_INJECT_TOKEN for graphql context', () => {
    const mockHandle = vi.fn().mockReturnValue({ pipe: vi.fn() });
    const gqlCtx: Record<string, any> = {
      req: { headers: {} },
    };

    const { GqlExecutionContext } = require('@nestjs/graphql');
    vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => gqlCtx,
    } as any);

    const context = {
      getType: vi.fn().mockReturnValue('graphql'),
      getArgs: vi.fn().mockReturnValue([]),
      getClass: vi.fn(),
      getHandler: vi.fn(),
      switchToHttp: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
    } as any;

    const next = { handle: mockHandle } as any;

    interceptor.intercept(context, next);

    expect(gqlCtx[DATA_LOADER_CTX_INJECT_TOKEN]).toBeDefined();
    expect(gqlCtx[DATA_LOADER_CTX_INJECT_TOKEN].contextId).toBeDefined();
    expect(typeof gqlCtx[DATA_LOADER_CTX_INJECT_TOKEN].get).toBe('function');
    expect(mockHandle).toHaveBeenCalledOnce();
  });

  it('skips rpc/rmq contexts', () => {
    const mockHandle = vi.fn().mockReturnValue({ pipe: vi.fn() });
    const context = {
      getType: vi.fn().mockReturnValue('rpc'),
    } as any;
    const next = { handle: mockHandle } as any;

    interceptor.intercept(context, next);

    expect(mockHandle).toHaveBeenCalledOnce();
  });

  it('skips rmq context type', () => {
    const mockHandle = vi.fn().mockReturnValue({ pipe: vi.fn() });
    const context = {
      getType: vi.fn().mockReturnValue('rmq'),
    } as any;
    const next = { handle: mockHandle } as any;

    interceptor.intercept(context, next);

    expect(mockHandle).toHaveBeenCalledOnce();
  });

  it('verifies the injected context entry has correct shape', () => {
    const mockHandle = vi.fn().mockReturnValue({ pipe: vi.fn() });
    const gqlCtx: Record<string, any> = {
      req: {
        headers: { connection: 'Upgrade', upgrade: 'websocket' },
        user: { actorID: 'test-user' },
      },
    };

    const { GqlExecutionContext } = require('@nestjs/graphql');
    vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: () => gqlCtx,
    } as any);

    const context = {
      getType: vi.fn().mockReturnValue('graphql'),
    } as any;
    const next = { handle: mockHandle } as any;

    interceptor.intercept(context, next);

    const entry = gqlCtx[DATA_LOADER_CTX_INJECT_TOKEN];
    expect(entry).toBeDefined();
    expect(entry.contextId).toBeDefined();
    expect(typeof entry.get).toBe('function');
  });
});
