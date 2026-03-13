import { AuthenticationService } from '@core/authentication/authentication.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { vi } from 'vitest';
import { SessionExtendMiddleware } from './session.extend.middleware';

describe('SessionExtendMiddleware', () => {
  function createMockConfigService(enabled: boolean) {
    return {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'identity.authentication.providers.ory.session_cookie_name')
          return 'ory_session';
        if (
          key === 'identity.authentication.providers.ory.session_extend_enabled'
        )
          return enabled;
        if (
          key ===
          'identity.authentication.providers.ory.kratos_public_base_url_server'
        )
          return 'http://localhost:4433';
        return undefined;
      }),
    };
  }

  describe('when disabled', () => {
    let middleware: SessionExtendMiddleware;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SessionExtendMiddleware,
          MockCacheManager,
          MockWinstonProvider,
          {
            provide: ConfigService,
            useValue: createMockConfigService(false),
          },
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      middleware = module.get(SessionExtendMiddleware);
    });

    it('should be defined', () => {
      expect(middleware).toBeDefined();
    });

    it('calls next() immediately when disabled', async () => {
      const req = { headers: {} } as any;
      const res = {} as any;
      const next = vi.fn();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });

    it('calls next() even with authorization header when disabled', async () => {
      const req = {
        headers: { authorization: 'Bearer some-token' },
      } as any;
      const res = {} as any;
      const next = vi.fn();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalledOnce();
    });
  });

  describe('when enabled', () => {
    let middleware: SessionExtendMiddleware;
    let mockAuthService: any;
    let logger: any;

    beforeEach(async () => {
      mockAuthService = {
        shouldExtendSession: vi.fn().mockReturnValue(false),
        extendSession: vi.fn().mockResolvedValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SessionExtendMiddleware,
          MockCacheManager,
          MockWinstonProvider,
          {
            provide: ConfigService,
            useValue: createMockConfigService(true),
          },
          {
            provide: AuthenticationService,
            useValue: mockAuthService,
          },
        ],
      })
        .useMocker(defaultMockerFactory)
        .compile();

      middleware = module.get(SessionExtendMiddleware);
      logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
    });

    it('calls next when no authorization header', async () => {
      const req = { headers: {} } as any;
      const res = {} as any;
      const next = vi.fn();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(logger.verbose).toHaveBeenCalled();
    });

    it('calls next when JWT parsing throws', async () => {
      const req = {
        headers: { authorization: 'Bearer invalid-jwt' },
      } as any;
      const res = {} as any;
      const next = vi.fn();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(logger.verbose).toHaveBeenCalled();
    });

    it('calls next without extending when shouldExtendSession returns false', async () => {
      // We need to mock getSessionFromJwt to avoid the JWT parsing error
      const utils = await import('@common/utils');
      const spy = vi.spyOn(utils, 'getSessionFromJwt').mockReturnValue({
        id: 'session-1',
      } as any);

      mockAuthService.shouldExtendSession.mockReturnValue(false);

      const req = {
        headers: { authorization: 'Bearer valid-token' },
      } as any;
      const res = {} as any;
      const next = vi.fn();

      await middleware.use(req, res, next);

      expect(next).toHaveBeenCalledOnce();
      expect(mockAuthService.shouldExtendSession).toHaveBeenCalledWith({
        id: 'session-1',
      });
      expect(mockAuthService.extendSession).not.toHaveBeenCalled();

      spy.mockRestore();
    });

    it('extends session and warns when session cookie is missing', async () => {
      const utils = await import('@common/utils');
      const spy = vi.spyOn(utils, 'getSessionFromJwt').mockReturnValue({
        id: 'session-1',
      } as any);

      mockAuthService.shouldExtendSession.mockReturnValue(true);

      const req = {
        headers: { authorization: 'Bearer valid-token' },
        cookies: {},
      } as any;
      const res = {} as any;
      const next = vi.fn();

      await middleware.use(req, res, next);

      expect(mockAuthService.extendSession).toHaveBeenCalledWith({
        id: 'session-1',
      });
      expect(logger.warn).toHaveBeenCalled();
      expect(next).toHaveBeenCalledOnce();

      spy.mockRestore();
    });

    it('logs error when extendSession throws', async () => {
      const utils = await import('@common/utils');
      const spy = vi.spyOn(utils, 'getSessionFromJwt').mockReturnValue({
        id: 'session-1',
      } as any);

      mockAuthService.shouldExtendSession.mockReturnValue(true);
      mockAuthService.extendSession.mockRejectedValue(
        new Error('extend failed')
      );

      const req = {
        headers: { authorization: 'Bearer valid-token' },
        cookies: {},
      } as any;
      const res = {} as any;
      const next = vi.fn();

      await middleware.use(req, res, next);

      expect(logger.error).toHaveBeenCalled();
      expect(next).toHaveBeenCalledOnce();

      spy.mockRestore();
    });
  });
});
