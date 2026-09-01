import type { ActorContextService } from '@core/actor-context/actor.context.service';
import {
  BearerValidationError,
  CookieSessionInvalidError,
} from '@core/auth/oidc/strategies/auth.errors';
import { SessionStoreUnavailableError } from '@core/auth/oidc/strategies/cookie-session.errors';
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

    it('preserves the original raw ASCII guest-header contract', async () => {
      const mockReq = guestHeaderRequest('John Visitor');
      noAuthenticatedUser();

      await interceptor.intercept(httpContext(mockReq), mockNext);

      expect(actorContextService.createGuest).toHaveBeenCalledWith(
        'John Visitor'
      );
      expect(mockReq.user).toEqual({
        isAnonymous: false,
        guestName: 'John Visitor',
        credentials: [{ type: 'global-guest', resourceID: '' }],
      });
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

      it('passes entry points through even with no cookie config', async () => {
        // The pass-through needs no cookie attributes — only the clear does. When
        // they shared a guard, a missing ConfigService silently 401'd /login too,
        // which contradicts the "absent config changes nothing else" contract.
        rejectWith(new CookieSessionInvalidError('account_deleted', 'c'));

        await expect(
          withConfig(undefined).intercept(
            entryPointCtx('/api/auth/oidc/login', mockRes()),
            mockNext
          )
        ).resolves.toBeDefined();
        expect(mockNext.handle).toHaveBeenCalled();
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

/**
 * Regression coverage for defect D3 of alkem-io/server#6332 — contract
 * obligations U1, U2, U3, U6 and U9 of
 * `specs/109-redis-session-store-resilience/contracts/store-unavailable-response.md`.
 *
 * On `develop` @ caa1a0d33 the passport callback's allow-list preserved only
 * `BearerValidationError` and `CookieSessionInvalidError`, so
 * `SessionStoreUnavailableError` was wrapped into `AuthenticationException`
 * ~120 lines BEFORE the outer catch whose own comment claims the error reaches
 * its own exception filter. By the time that catch ran the type was already
 * gone, `@Catch(SessionStoreUnavailableError)` never matched, and a store
 * outage surfaced as 401 UNAUTHENTICATED / numericCode 11101.
 *
 * That is not cosmetic: a single-page application reads 401 as "your session is
 * invalid, sign in again" and 503 + Retry-After as "come back in five seconds",
 * so any Redis blip presented as a forced logout or a redirect loop.
 */
describe('server#6332 — store-unreachable is 503, never 401 (D3)', () => {
  let actorContextService: ActorContextService;
  let mockNext: CallHandler;

  const COOKIE = {
    name: 'alkemio_session_sandbox',
    secure: true,
    domain: 'alkem.io',
    idle_ttl_s: 1_209_600, // 14 days
  };

  const PRESENTED = 's:live-sid.a-valid-looking-signature';

  beforeEach(() => {
    vi.restoreAllMocks();
    actorContextService = {
      createAnonymous: vi.fn().mockReturnValue({ isAnonymous: true }),
    } as unknown as ActorContextService;
    mockNext = { handle: vi.fn().mockReturnValue(of('ok')) };
  });

  const build = () =>
    new AuthInterceptor(actorContextService, {
      get: vi.fn().mockReturnValue(COOKIE),
    } as any);

  const rejectWith = (err: Error) =>
    vi
      .spyOn(passport, 'authenticate')
      .mockImplementation(
        (_s: any, _o: any, callback: any) => (_req: any) => callback(err)
      );

  const mockRes = () => ({
    cookie: vi.fn(),
    setHeader: vi.fn(),
    headersSent: false,
  });

  /**
   * The REAL GraphQL context shape in this app: `app.module.ts` returns
   * `{ req }` from the Apollo context factory and never `res`, so the response
   * is reachable only through `req.res`.
   */
  const gqlCtx = (res: any, url = '/api/private/graphql') => {
    const req = {
      method: 'POST',
      url,
      headers: {},
      cookies: { [COOKIE.name]: PRESENTED },
      res,
    };
    const ctx = {
      getType: vi.fn().mockReturnValue('graphql'),
    } as unknown as ExecutionContext;
    vi.spyOn(GqlExecutionContext, 'create').mockReturnValue({
      getContext: vi.fn().mockReturnValue({ req }),
    } as any);
    return ctx;
  };

  // U1 — the allow-list fix itself, asserted at the boundary where the defect
  // lived. If the type is lost here, every assertion below is unreachable.
  it('U1 — preserves SessionStoreUnavailableError instead of wrapping it', async () => {
    rejectWith(new SessionStoreUnavailableError(new Error('ECONNREFUSED')));

    // Distinguishable sentinel rather than `undefined`: mapping a RESOLVED
    // intercept to `undefined` would make the negative assertion below pass
    // vacuously (`undefined?.constructor?.name` is `undefined`, which is not
    // 'AuthenticationException'), so a regression that SWALLOWS the store
    // error and lets the request continue as an anonymous actor would satisfy
    // the one assertion this docblock calls the boundary.
    const SWALLOWED = Symbol('intercept resolved instead of throwing');

    const error = await build()
      .intercept(gqlCtx(mockRes()), mockNext)
      .then(
        () => SWALLOWED,
        (e: unknown) => e
      );

    // The store failure must surface, not be absorbed into an anonymous request.
    expect(error).not.toBe(SWALLOWED);

    // And it must NOT have become an authentication failure. On develop this is
    // exactly what it became.
    expect((error as Error)?.constructor?.name).not.toBe(
      'AuthenticationException'
    );
  });

  it('U2 — answers 503 / numericCode 14119, not 401 / 11101 (FR-030)', async () => {
    rejectWith(new SessionStoreUnavailableError(new Error('ECONNREFUSED')));

    const error: any = await build()
      .intercept(gqlCtx(mockRes()), mockNext)
      .then(
        () => undefined,
        (e: unknown) => e
      );

    // Apollo Server 4 reads `extensions.http.status` to override the wire HTTP
    // status; without it Apollo answers 200 with an errors envelope and SC-003
    // (which asserts the WIRE status) would be unmeetable.
    expect(error?.extensions?.http?.status).toBe(503);
    expect(error?.extensions?.code).toBe('SESSION_STORE_UNAVAILABLE');
    expect(error?.extensions?.numericCode).toBe(14119);

    // The two codes the defect produced, explicitly excluded — band 11 means
    // "we decided about your identity", band 14 means "our infrastructure
    // failed", and keeping them apart is the point of the whole feature.
    expect(error?.extensions?.code).not.toBe('UNAUTHENTICATED');
    expect(error?.extensions?.numericCode).not.toBe(11101);
  });

  it('U3 — sets Retry-After: 5 on the response', async () => {
    const res = mockRes();
    rejectWith(new SessionStoreUnavailableError(new Error('ECONNREFUSED')));

    await expect(build().intercept(gqlCtx(res), mockNext)).rejects.toThrow();

    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '5');
  });

  it('re-asserts the presented cookie with its full attributes, never clearing it', async () => {
    const res = mockRes();
    rejectWith(new SessionStoreUnavailableError(new Error('ECONNREFUSED')));

    await expect(build().intercept(gqlCtx(res), mockNext)).rejects.toThrow();

    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE.name,
      PRESENTED, // the raw signed value exactly as presented — no re-signing
      expect.objectContaining({
        secure: true,
        domain: 'alkem.io',
        maxAge: COOKIE.idle_ttl_s * 1000,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      })
    );

    // The distinction this feature exists to preserve: "session ended" clears,
    // "store briefly unreachable" re-asserts. A max-age=0 here would sign the
    // whole platform out on a Redis blip.
    const [, , options] = (res.cookie as any).mock.calls[0];
    expect(options.maxAge).not.toBe(0);
  });

  // U6 — the guard against over-correcting. It would be easy to satisfy every
  // assertion above by never clearing the cookie for anything, which would
  // reintroduce the #6315 lockout this file already tests for.
  it('U6 — a genuinely rejected session still 401s AND still clears the cookie', async () => {
    const res = mockRes();
    rejectWith(new CookieSessionInvalidError('account_deleted', 'corr-9'));

    const error: any = await build()
      .intercept(gqlCtx(res), mockNext)
      .then(
        () => undefined,
        (e: unknown) => e
      );

    expect(error?.extensions?.http?.status).toBe(401);
    expect(res.cookie).toHaveBeenCalledWith(
      COOKIE.name,
      '',
      expect.objectContaining({ maxAge: 0 })
    );
  });

  // U9 — FR-022 / contract G6. `isAuthEntryPoint` already exempts these routes
  // from a REJECTED session; extending that exemption to an UNREACHABLE store
  // is an easy reflex, and wrong. /callback and /logout genuinely need the
  // store, and letting /login through during an outage only produces a sign-in
  // that cannot complete.
  it.each([
    '/api/auth/oidc/login',
    '/api/auth/oidc/callback',
    '/api/auth/oidc/logout',
  ])('U9 — %s answers 503 rather than passing through as anonymous', async url => {
    const res = mockRes();
    rejectWith(new SessionStoreUnavailableError(new Error('ECONNREFUSED')));

    const error: any = await build()
      .intercept(gqlCtx(res, url), mockNext)
      .then(
        () => undefined,
        (e: unknown) => e
      );

    expect(error?.extensions?.http?.status).toBe(503);
    expect(res.setHeader).toHaveBeenCalledWith('Retry-After', '5');
    // Emphatically NOT let through to the resolver as an anonymous actor.
    expect(mockNext.handle).not.toHaveBeenCalled();
  });
});
