import { INNOVATION_HUB_INJECT_TOKEN } from '@common/constants';
import { type Mocked, vi } from 'vitest';

// Must mock @nestjs/graphql before any import that transitively uses registerEnumType
vi.mock('@nestjs/graphql', async importOriginal => {
  const actual = await importOriginal<typeof import('@nestjs/graphql')>();
  return {
    ...actual,
    GqlExecutionContext: {
      create: vi.fn(),
    },
  };
});

import type { InnovationHubService } from '@domain/innovation-hub/innovation.hub.service';
import type {
  CallHandler,
  ExecutionContext,
  LoggerService,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { GqlExecutionContext } from '@nestjs/graphql';
import { of } from 'rxjs';
import { InnovationHubInterceptor } from './innovation.hub.interceptor';

describe('InnovationHubInterceptor', () => {
  let interceptor: InnovationHubInterceptor;
  let mockInnovationHubService: Mocked<InnovationHubService>;
  let mockConfigService: Mocked<ConfigService>;
  let mockLogger: Mocked<LoggerService>;
  let mockCallHandler: Mocked<CallHandler>;
  let mockContext: Mocked<ExecutionContext>;

  beforeEach(() => {
    mockInnovationHubService = {
      getInnovationHubFlexOrFail: vi.fn(),
    } as any;

    mockConfigService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'innovation_hub.header') return 'x-alkemio-hub';
        if (key === 'innovation_hub.whitelisted_subdomains') return 'www,app';
        return '';
      }),
    } as any;

    mockLogger = {
      warn: vi.fn(),
      error: vi.fn(),
      verbose: vi.fn(),
      log: vi.fn(),
    } as any;

    mockCallHandler = {
      handle: vi.fn().mockReturnValue(of('next')),
    } as any;

    mockContext = {
      getType: vi.fn(),
      switchToHttp: vi.fn(),
    } as any;

    interceptor = new InnovationHubInterceptor(
      mockInnovationHubService,
      mockConfigService,
      mockLogger
    );
  });

  it('should skip non-graphql contexts', async () => {
    mockContext.getType.mockReturnValue('http');

    await interceptor.intercept(mockContext, mockCallHandler);

    expect(mockCallHandler.handle).toHaveBeenCalled();
    expect(GqlExecutionContext.create).not.toHaveBeenCalled();
  });

  it('should skip rpc context types', async () => {
    mockContext.getType.mockReturnValue('rpc');

    await interceptor.intercept(mockContext, mockCallHandler);

    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should skip when request headers are missing', async () => {
    mockContext.getType.mockReturnValue('graphql');
    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => ({ req: null }),
    } as any);

    await interceptor.intercept(mockContext, mockCallHandler);

    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should skip when host header is not present', async () => {
    mockContext.getType.mockReturnValue('graphql');
    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => ({
        req: { headers: {} },
      }),
    } as any);

    await interceptor.intercept(mockContext, mockCallHandler);

    expect(mockCallHandler.handle).toHaveBeenCalled();
    expect(
      mockInnovationHubService.getInnovationHubFlexOrFail
    ).not.toHaveBeenCalled();
  });

  it('should skip when host does not match subdomain regex', async () => {
    mockContext.getType.mockReturnValue('graphql');
    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => ({
        req: {
          headers: { 'x-alkemio-hub': 'https://alkem.io/' },
        },
      }),
    } as any);

    await interceptor.intercept(mockContext, mockCallHandler);

    expect(
      mockInnovationHubService.getInnovationHubFlexOrFail
    ).not.toHaveBeenCalled();
  });

  it('should skip whitelisted subdomains', async () => {
    mockContext.getType.mockReturnValue('graphql');
    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => ({
        req: {
          headers: { 'x-alkemio-hub': 'https://www.alkem.io/' },
        },
      }),
    } as any);

    await interceptor.intercept(mockContext, mockCallHandler);

    expect(
      mockInnovationHubService.getInnovationHubFlexOrFail
    ).not.toHaveBeenCalled();
  });

  it('should inject innovation hub for valid subdomain', async () => {
    const mockHub = { id: 'hub-1', subdomain: 'test' };
    const gqlContext: Record<string, any> = {
      req: {
        headers: { 'x-alkemio-hub': 'https://test.alkem.io/' },
      },
    };

    mockContext.getType.mockReturnValue('graphql');
    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => gqlContext,
    } as any);
    mockInnovationHubService.getInnovationHubFlexOrFail.mockResolvedValue(
      mockHub as any
    );

    await interceptor.intercept(mockContext, mockCallHandler);

    expect(
      mockInnovationHubService.getInnovationHubFlexOrFail
    ).toHaveBeenCalledWith({ subdomain: 'test' });
    expect(gqlContext[INNOVATION_HUB_INJECT_TOKEN]).toBe(mockHub);
  });

  it('should log warning when innovation hub is not found', async () => {
    const gqlContext: Record<string, any> = {
      req: {
        headers: { 'x-alkemio-hub': 'https://unknown.alkem.io/' },
      },
    };

    mockContext.getType.mockReturnValue('graphql');
    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => gqlContext,
    } as any);
    mockInnovationHubService.getInnovationHubFlexOrFail.mockRejectedValue(
      new Error('Not found')
    );

    await interceptor.intercept(mockContext, mockCallHandler);

    expect(mockLogger.warn).toHaveBeenCalled();
    expect(mockCallHandler.handle).toHaveBeenCalled();
  });

  it('should still call next.handle() even when hub lookup fails', async () => {
    const gqlContext: Record<string, any> = {
      req: {
        headers: { 'x-alkemio-hub': 'https://failing.alkem.io/' },
      },
    };

    mockContext.getType.mockReturnValue('graphql');
    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => gqlContext,
    } as any);
    mockInnovationHubService.getInnovationHubFlexOrFail.mockRejectedValue(
      new Error('Service error')
    );

    const result = await interceptor.intercept(mockContext, mockCallHandler);

    expect(mockCallHandler.handle).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should handle multi-level subdomains correctly', async () => {
    const mockHub = { id: 'hub-2', subdomain: 'acc' };
    const gqlContext: Record<string, any> = {
      req: {
        headers: {
          'x-alkemio-hub': 'https://acc.acc1.acc2.alkem.io/',
        },
      },
    };

    mockContext.getType.mockReturnValue('graphql');
    vi.mocked(GqlExecutionContext.create).mockReturnValue({
      getContext: () => gqlContext,
    } as any);
    mockInnovationHubService.getInnovationHubFlexOrFail.mockResolvedValue(
      mockHub as any
    );

    await interceptor.intercept(mockContext, mockCallHandler);

    expect(
      mockInnovationHubService.getInnovationHubFlexOrFail
    ).toHaveBeenCalledWith({ subdomain: 'acc' });
  });
});
