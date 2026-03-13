import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { IncomingMessage } from 'http';
import { type Mocked, vi } from 'vitest';
import { AuthenticationService } from './authentication.service';
import { OryApiStrategy } from './ory.api.strategy';

describe('OryApiStrategy', () => {
  let strategy: OryApiStrategy;
  let configService: Mocked<ConfigService>;
  let authService: Mocked<AuthenticationService>;
  let actorContextService: Mocked<ActorContextService>;
  let kratosService: Mocked<KratosService>;

  const anonymousContext: ActorContext = {
    actorID: '',
    credentials: [],
    isAnonymous: true,
  };

  const authenticatedContext: ActorContext = {
    actorID: 'user-id',
    credentials: [],
    isAnonymous: false,
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [OryApiStrategy, MockWinstonProvider],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return {
            get: vi.fn().mockImplementation((key: string) => {
              if (key === 'identity.authentication.api_access_enabled') {
                return true;
              }
              if (key === 'identity.authentication.providers.ory') {
                return {
                  kratos_public_base_url_server: 'mockUrl',
                  kratos_admin_base_url_server: 'mockUrl',
                  admin_service_account: {
                    username: 'mock',
                    password: 'mock',
                  },
                  earliest_possible_extend: '5m',
                };
              }
              if (key === 'identity.authentication.cache_ttl') {
                return 300;
              }
              return {};
            }),
          };
        }
        if (token === AuthenticationService) {
          return {
            createActorContext: vi.fn(),
            getActorContext: vi.fn(),
          };
        }
        if (token === ActorContextService) {
          return {
            createAnonymous: vi.fn().mockReturnValue(anonymousContext),
            createGuest: vi.fn(),
            populateFromActorID: vi.fn(),
          };
        }
        if (token === KratosService) {
          return {
            getSessionFromBearerToken: vi.fn(),
            getSession: vi.fn(),
            getBearerToken: vi.fn(),
            tryExtendSession: vi.fn(),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    strategy = module.get(OryApiStrategy);
    configService = module.get(ConfigService);
    authService = module.get(AuthenticationService);
    actorContextService = module.get(ActorContextService);
    kratosService = module.get(KratosService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should throw ApiRestrictedAccessException when API access is disabled', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'identity.authentication.api_access_enabled') {
          return false;
        }
        return {};
      });

      const payload = {
        headers: { authorization: 'Bearer some-token' },
      } as IncomingMessage;

      await expect(strategy.validate(payload)).rejects.toThrow(
        'API access is restricted!'
      );
    });

    it('should return anonymous context when no bearer token is provided', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'identity.authentication.api_access_enabled') {
          return true;
        }
        return {};
      });

      const payload = {
        headers: {},
      } as IncomingMessage;

      const result = await strategy.validate(payload);

      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });

    it('should return anonymous context when authorization header has no token', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'identity.authentication.api_access_enabled') {
          return true;
        }
        return {};
      });

      const payload = {
        headers: { authorization: 'Bearer ' },
      } as unknown as IncomingMessage;

      // 'Bearer '.split(' ')[1] returns '' which is falsy
      const result = await strategy.validate(payload);

      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });

    it('should return anonymous context when Kratos session is null', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'identity.authentication.api_access_enabled') {
          return true;
        }
        return {};
      });

      kratosService.getSessionFromBearerToken.mockResolvedValue(null as any);

      const payload = {
        headers: { authorization: 'Bearer valid-token' },
      } as unknown as IncomingMessage;

      const result = await strategy.validate(payload);

      expect(kratosService.getSessionFromBearerToken).toHaveBeenCalledWith(
        'valid-token'
      );
      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });

    it('should return anonymous context when session identity has no alkemio_actor_id', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'identity.authentication.api_access_enabled') {
          return true;
        }
        return {};
      });

      kratosService.getSessionFromBearerToken.mockResolvedValue({
        id: 'session-id',
        identity: {
          id: 'identity-id',
          metadata_public: {},
          schema_id: 'default',
          schema_url: 'http://test.com/schema',
          traits: {},
          verifiable_addresses: [],
        },
      } as any);

      const payload = {
        headers: { authorization: 'Bearer valid-token' },
      } as unknown as IncomingMessage;

      const result = await strategy.validate(payload);

      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });

    it('should create actor context when session has valid identity with alkemio_actor_id', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'identity.authentication.api_access_enabled') {
          return true;
        }
        return {};
      });

      const session = {
        id: 'session-id',
        identity: {
          id: 'identity-id',
          metadata_public: { alkemio_actor_id: 'user-id' },
          schema_id: 'default',
          schema_url: 'http://test.com/schema',
          traits: {},
          verifiable_addresses: [],
        },
      } as any;

      kratosService.getSessionFromBearerToken.mockResolvedValue(session);
      authService.createActorContext.mockResolvedValue(authenticatedContext);

      const payload = {
        headers: { authorization: 'Bearer valid-token' },
      } as unknown as IncomingMessage;

      const result = await strategy.validate(payload);

      expect(authService.createActorContext).toHaveBeenCalledWith(
        'user-id',
        expect.objectContaining({ id: 'session-id' })
      );
      expect(result).toEqual(authenticatedContext);
    });
  });
});
