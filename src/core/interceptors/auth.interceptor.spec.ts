import type { ActorContextService } from '@core/actor-context/actor.context.service';
import {
  BearerValidationError,
  CookieSessionInvalidError,
} from '@core/auth/oidc/strategies/auth.errors';
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
  let actorContextService: ActorContextService;

  beforeEach(() => {
    actorContextService = {
      createAnonymous: vi
        .fn()
        .mockReturnValue({ isAnonymous: true, credentials: [] }),
      createGuest: vi.fn().mockImplementation((name: string) => ({
        isAnonymous: false,
        guestName: name,
        credentials: [{ type: 'global-guest', resourceID: '' }],
      })),
    } as unknown as ActorContextService;
    interceptor = new AuthInterceptor(actorContextService);
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

    it('should resolve with anonymous ActorContext when auth fails without error', async () => {
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

      // Failed auth normalizes to an anonymous ActorContext so downstream
      // resolvers can safely read `req.user.credentials` without null guards.
      expect(mockReq.user).toEqual({ isAnonymous: true, credentials: [] });
    });
  });

  describe('guest header (x-guest-name)', () => {
    const guestHeaderRequest = (encodedName: unknown) =>
      ({
        method: 'POST',
        url: '/graphql',
        headers: { 'x-guest-name': encodedName },
      }) as any;

    const noAuthenticatedUser = () =>
      vi.spyOn(passport, 'authenticate').mockImplementation(
        (_strategies: any, _options: any, callback: any) => (_req: any) =>
          callback(null, false) // no session/bearer → no user
      );

    const httpContext = (req: any) =>
      ({
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          getRequest: vi.fn().mockReturnValue(req),
        }),
      }) as unknown as ExecutionContext;

    it('resolves a guest ActorContext from a base64 x-guest-name header when unauthenticated', async () => {
      const guestName = 'José Müller';
      const encoded = Buffer.from(guestName, 'utf-8').toString('base64');
      const mockReq = guestHeaderRequest(encoded);
      noAuthenticatedUser();

      await interceptor.intercept(httpContext(mockReq), mockNext);

      expect(actorContextService.createGuest).toHaveBeenCalledWith(guestName);
      expect(actorContextService.createAnonymous).not.toHaveBeenCalled();
      expect(mockReq.user).toEqual({
        isAnonymous: false,
        guestName,
        credentials: [{ type: 'global-guest', resourceID: '' }],
      });
    });

    it('does NOT override an authenticated user with the guest header', async () => {
      const mockUser = { actorID: 'user-1', credentials: [] };
      const mockReq = guestHeaderRequest(
        Buffer.from('Mallory', 'utf-8').toString('base64')
      );
      vi.spyOn(passport, 'authenticate').mockImplementation(
        (_strategies: any, _options: any, callback: any) => (_req: any) =>
          callback(null, mockUser)
      );

      await interceptor.intercept(httpContext(mockReq), mockNext);

      expect(actorContextService.createGuest).not.toHaveBeenCalled();
      expect(mockReq.user).toEqual(mockUser);
    });

    it('falls back to anonymous when the guest header is empty after decode', async () => {
      const mockReq = guestHeaderRequest(
        Buffer.from('   ', 'utf-8').toString('base64')
      );
      noAuthenticatedUser();

      await interceptor.intercept(httpContext(mockReq), mockNext);

      expect(actorContextService.createGuest).not.toHaveBeenCalled();
      expect(mockReq.user).toEqual({ isAnonymous: true, credentials: [] });
    });
  });

  // server#6315. This interceptor is global, so a rejected cookie session 401s
  // EVERY route — including /api/auth/oidc/login. Until the cookie goes, the
  // holder cannot sign in again as anyone, on that machine, for as long as the
  // rejected payload lives: 5 minutes for a tombstone, up to the full 14-day
  // idle window for a session the subject-revocation marker rejects.
  describe('server#6315 — clears the session cookie on a rejected session', () => {
    const COOKIE = {
      name: 'alkemio_session_sandbox',
      secure: true,
      domain: 'alkem.io',
    };

    function withConfig(cookie: typeof COOKIE | undefined) {
      const configService = cookie
        ? ({ get: vi.fn().mockReturnValue(cookie) } as any)
        : undefined;
      return new AuthInterceptor(actorContextService, configService);
    }

    function rejectWith(err: Error) {
      vi.spyOn(passport, 'authenticate').mockImplementation(
        (_s: any, _o: any, callback: any) => (_req: any) => callback(err)
      );
    }

    const mockRes = () => ({ cookie: vi.fn(), headersSent: false });

    function httpCtx(res: any) {
      return {
        getType: vi.fn().mockReturnValue('http'),
        switchToHttp: vi.fn().mockReturnValue({
          // `url` is required: getRequest treats a request without method+url
          // as a non-HTTP transport and skips authentication altogether, so
          // omitting it makes these tests pass without exercising anything.
          // An ordinary guarded route. NOT one of the auth entry points, which
          // are exempted below and would pass through instead of rejecting.
          getRequest: vi.fn().mockReturnValue({
            method: 'POST',
            url: '/api/private/graphql',
            headers: { cookie: 'alkemio_session_sandbox=s%3Adead' },
          }),
          getResponse: vi.fn().mockReturnValue(res),
        }),
      } as unknown as ExecutionContext;
    }

    /**
     * The REAL GraphQL context shape in this app.
     *
     * `app.module.ts` returns `{ req: ctx.req }` from the Apollo context
     * factory — no `res`. An earlier version of this test mocked `res` INTO the
     * context and passed while the running server emitted no Set-Cookie at all,
     * which is precisely the class of mistake this whole feature already made
     * once. The response is reachable only via `req.res`, so that is what the
     * fixture models.
     */
    function gqlCtx(res: any) {
      const req = { headers: {}, res };
      const ctx = {
        getType: vi.fn().mockReturnValue('graphql'),
      } as unknown as ExecutionContext;
      vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
        getContext: vi.fn().mockReturnValue({ req }),
      } as any);
      return ctx;
    }

    it('expires the cookie with the configured name, domain and secure flag', async () => {
      const res = mockRes();
      rejectWith(new CookieSessionInvalidError('account_deleted', 'corr-1'));

      await expect(
        withConfig(COOKIE).intercept(httpCtx(res), mockNext)
      ).rejects.toThrow();

      expect(res.cookie).toHaveBeenCalledWith(
        'alkemio_session_sandbox',
        '',
        expect.objectContaining({
          maxAge: 0,
          domain: 'alkem.io',
          secure: true,
          path: '/',
        })
      );
    });

    it('also clears on the GraphQL path, where there is no switchToHttp response', async () => {
      // The majority of traffic. Reaching for switchToHttp here would return
      // undefined and silently skip the clear for nearly every real request.
      const res = mockRes();
      rejectWith(new CookieSessionInvalidError('subject_revoked', 'corr-2'));

      await expect(
        withConfig(COOKIE).intercept(gqlCtx(res), mockNext)
      ).rejects.toThrow();

      expect(res.cookie).toHaveBeenCalledWith(
        'alkemio_session_sandbox',
        '',
        expect.objectContaining({ maxAge: 0 })
      );
    });

    it('does NOT clear for a bearer-token failure', async () => {
      // A bad Authorization header says nothing about the caller's cookie;
      // clearing it would sign out a browser because an API call misfired.
      const res = mockRes();
      rejectWith(new BearerValidationError('invalid_audience', 'corr-3'));

      await expect(
        withConfig(COOKIE).intercept(httpCtx(res), mockNext)
      ).rejects.toThrow();

      expect(res.cookie).not.toHaveBeenCalled();
    });

    it('does NOT clear when the session store is merely unreachable', async () => {
      // The 503 path deliberately re-asserts the cookie so the jar stays warm
      // across a transient Redis blip. Clearing here would sign out the entire
      // platform on a hiccup. "Session ended" clears; "store unreachable" does
      // not — and that error is rethrown untouched for its own filter.
      const res = mockRes();
      const storeDown = new Error('redis unreachable');
      storeDown.name = 'SessionStoreUnavailableError';
      rejectWith(storeDown);

      await expect(
        withConfig(COOKIE).intercept(httpCtx(res), mockNext)
      ).rejects.toThrow('redis unreachable');

      expect(res.cookie).not.toHaveBeenCalled();
    });

    // Clearing the cookie alone leaves one broken click: the clear rides on the
    // rejected response, so a browser whose FIRST action after a revocation is
    // hitting /login sees a 401 page and must try again. These routes exist to
    // fix exactly that state, so they proceed as anonymous.
    describe('auth entry points stay reachable', () => {
      const entryPointCtx = (url: string, res: any) =>
        ({
          getType: vi.fn().mockReturnValue('http'),
          switchToHttp: vi.fn().mockReturnValue({
            getRequest: vi.fn().mockReturnValue({
              method: 'GET',
              url,
              headers: { cookie: 'alkemio_session_sandbox=s%3Adead' },
            }),
            getResponse: vi.fn().mockReturnValue(res),
          }),
        }) as unknown as ExecutionContext;

      it.each([
        '/api/auth/oidc/login',
        '/api/auth/oidc/login?returnTo=https%3A%2F%2Falkem.io%2Fhome',
        '/api/auth/oidc/callback?code=abc&state=xyz',
        '/api/auth/oidc/logout',
      ])('passes through as anonymous: %s', async url => {
        const res = mockRes();
        rejectWith(new CookieSessionInvalidError('account_deleted', 'c'));

        await expect(
          withConfig(COOKIE).intercept(entryPointCtx(url, res), mockNext)
        ).resolves.toBeDefined();

        // Still clears — the browser must not keep presenting the dead cookie.
        expect(res.cookie).toHaveBeenCalled();
        expect(mockNext.handle).toHaveBeenCalled();
      });

      it.each([
        '/api/auth/oidc/id-token-hint',
        '/api/auth/oidc/refresh',
        '/api/private/graphql',
        // A prefix match would wave this through; an exact-path match does not.
        '/api/auth/oidc/login/../id-token-hint',
        // Nor can the path be smuggled in via the query string.
        '/api/private/graphql?next=/api/auth/oidc/login',
      ])('still rejects: %s', async url => {
        rejectWith(new CookieSessionInvalidError('subject_revoked', 'c'));

        await expect(
          withConfig(COOKIE).intercept(entryPointCtx(url, mockRes()), mockNext)
        ).rejects.toThrow();
      });
    });

    it('still returns 401 when no cookie config is available', async () => {
      // Test harnesses construct this interceptor without a ConfigService.
      // Degrading to "no clear" is acceptable; degrading to a 500 is not.
      rejectWith(new CookieSessionInvalidError('account_deleted', 'corr-4'));

      await expect(
        withConfig(undefined).intercept(httpCtx(mockRes()), mockNext)
      ).rejects.toThrow();
    });
  });
});
