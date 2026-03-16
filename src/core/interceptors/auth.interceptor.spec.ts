import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
// We need to mock passport at module level since it's imported statically.
// However, since vi.mock is not allowed, we'll use vi.spyOn on the imported passport module.
import passport from 'passport';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthInterceptor } from './auth.interceptor';

describe('AuthInterceptor', () => {
  let interceptor: AuthInterceptor;
  let mockNext: CallHandler;

  beforeEach(() => {
    interceptor = new AuthInterceptor();
    mockNext = {
      handle: vi.fn().mockReturnValue(of('response')),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('getRequest - context type handling', () => {
    it('should skip RPC contexts and call next.handle directly', async () => {
      const context = {
        getType: vi.fn().mockReturnValue('rpc'),
      } as unknown as ExecutionContext;

      const result = await interceptor.intercept(context, mockNext);

      expect(mockNext.handle).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should skip RMQ contexts and call next.handle directly', async () => {
      const context = {
        getType: vi.fn().mockReturnValue('rmq'),
      } as unknown as ExecutionContext;

      const result = await interceptor.intercept(context, mockNext);

      expect(mockNext.handle).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should extract request from GraphQL context', async () => {
      const mockReq = {
        headers: { authorization: 'Bearer test-token' },
      };

      // Spy on GqlExecutionContext.create to return our mock
      vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: vi.fn().mockReturnValue({ req: mockReq }),
      } as any);

      // Mock passport.authenticate to immediately resolve
      vi.spyOn(passport, 'authenticate').mockImplementation(
        (_strategies: any, _options: any, callback: any) => {
          return (_req: any) => {
            callback(null, { actorID: 'user-1', credentials: [] });
          };
        }
      );

      const context = {
        getType: vi.fn().mockReturnValue('graphql'),
      } as unknown as ExecutionContext;

      const result = await interceptor.intercept(context, mockNext);

      expect(GqlExecutionContext.create).toHaveBeenCalledWith(context);
      expect(mockReq.headers.authorization).toBeDefined();
      expect(mockNext.handle).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should extract request from HTTP context with auth headers', async () => {
      const mockReq = {
        method: 'GET',
        url: '/graphql',
        headers: { authorization: 'Bearer test-token' },
      };

      vi.spyOn(passport, 'authenticate').mockImplementation(
        (_strategies: any, _options: any, callback: any) => {
          return (_req: any) => {
            callback(null, { actorID: 'user-1', credentials: [] });
          };
        }
      );

      const context = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(mockReq),
        }),
      } as unknown as ExecutionContext;

      const result = await interceptor.intercept(context, mockNext);

      expect(mockNext.handle).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should skip HTTP context without method or url (non-HTTP transport)', async () => {
      const mockReq = {
        // No method, no url, no auth headers
      };

      const context = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(mockReq),
        }),
      } as unknown as ExecutionContext;

      const result = await interceptor.intercept(context, mockNext);

      // Should not attempt passport auth, just pass through
      expect(mockNext.handle).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should process HTTP context with cookie header', async () => {
      const mockReq = {
        method: 'GET',
        url: '/graphql',
        headers: { cookie: 'session=abc' },
      };

      vi.spyOn(passport, 'authenticate').mockImplementation(
        (_strategies: any, _options: any, callback: any) => {
          return (_req: any) => {
            callback(null, { actorID: 'user-1', credentials: [] });
          };
        }
      );

      const context = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(mockReq),
        }),
      } as unknown as ExecutionContext;

      const result = await interceptor.intercept(context, mockNext);

      expect(mockNext.handle).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('passport authentication', () => {
    it('should attach user to request on successful authentication', async () => {
      const mockUser = { actorID: 'user-1', credentials: [] };
      const mockReq: any = {
        method: 'GET',
        url: '/graphql',
        headers: { authorization: 'Bearer test' },
      };

      vi.spyOn(passport, 'authenticate').mockImplementation(
        (_strategies: any, _options: any, callback: any) => {
          return (_req: any) => {
            callback(null, mockUser);
          };
        }
      );

      const context = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(mockReq),
        }),
      } as unknown as ExecutionContext;

      await interceptor.intercept(context, mockNext);

      expect(mockReq.user).toEqual(mockUser);
    });

    it('should reject with AuthenticationException when passport returns error', async () => {
      const mockReq: any = {
        method: 'GET',
        url: '/graphql',
        headers: { authorization: 'Bearer bad-token' },
      };

      vi.spyOn(passport, 'authenticate').mockImplementation(
        (_strategies: any, _options: any, callback: any) => {
          return (_req: any) => {
            callback(new Error('Token expired'), null);
          };
        }
      );

      const context = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(mockReq),
        }),
      } as unknown as ExecutionContext;

      await expect(interceptor.intercept(context, mockNext)).rejects.toThrow(
        'Token expired'
      );
    });

    it('should reject with AuthenticationException when error is a string', async () => {
      const mockReq: any = {
        method: 'GET',
        url: '/graphql',
        headers: { authorization: 'Bearer bad-token' },
      };

      vi.spyOn(passport, 'authenticate').mockImplementation(
        (_strategies: any, _options: any, callback: any) => {
          return (_req: any) => {
            callback('String error', null);
          };
        }
      );

      const context = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(mockReq),
        }),
      } as unknown as ExecutionContext;

      await expect(interceptor.intercept(context, mockNext)).rejects.toThrow();
    });

    it('should resolve with user=false when auth fails without error', async () => {
      const mockReq: any = {
        method: 'GET',
        url: '/graphql',
        headers: { authorization: 'Bearer invalid' },
      };

      vi.spyOn(passport, 'authenticate').mockImplementation(
        (_strategies: any, _options: any, callback: any) => {
          return (_req: any) => {
            callback(null, false); // auth failed, no error
          };
        }
      );

      const context = {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(mockReq),
        }),
      } as unknown as ExecutionContext;

      await interceptor.intercept(context, mockNext);

      // user should be set to false (passport convention for failed auth)
      expect(mockReq.user).toBe(false);
    });
  });
});
