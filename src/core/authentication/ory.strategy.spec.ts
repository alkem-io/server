import { AuthenticationException } from '@common/exceptions';
import { SessionExpiredException } from '@common/exceptions/session.expired.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { KratosPayload } from '@services/infrastructure/kratos/types/kratos.payload';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { AuthenticationService } from './authentication.service';
import { OryStrategy } from './ory.strategy';

describe('OryStrategy', () => {
  let strategy: OryStrategy;
  let authService: Mocked<AuthenticationService>;
  let actorContextService: Mocked<ActorContextService>;

  const anonymousContext: ActorContext = {
    actorID: '',
    credentials: [],
    isAnonymous: true,
  };

  const guestContext: ActorContext = {
    actorID: '',
    credentials: [],
    isAnonymous: false,
    guestName: 'Test Guest',
  };

  const authenticatedContext: ActorContext = {
    actorID: 'user-id',
    credentials: [],
    isAnonymous: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OryStrategy, MockWinstonProvider],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return {
            get: vi.fn().mockImplementation((key: string) => {
              if (key === 'identity.authentication.providers.ory.jwks_uri') {
                return 'http://localhost/.well-known/jwks.json';
              }
              if (key === 'identity.authentication.providers.ory.issuer') {
                return 'http://localhost';
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
            createGuest: vi.fn().mockReturnValue(guestContext),
            populateFromActorID: vi.fn(),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    strategy = module.get(OryStrategy);
    authService = module.get(AuthenticationService);
    actorContextService = module.get(ActorContextService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return anonymous context when payload has no session and no guest header', async () => {
      const payload: KratosPayload = {} as any;
      const req = { headers: {} };

      const result = await strategy.validate(req, payload);

      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });

    it('should return guest context when no session but x-guest-name header is present', async () => {
      const payload: KratosPayload = {} as any;
      const req = { headers: { 'x-guest-name': 'Test Guest' } };

      const result = await strategy.validate(req, payload);

      expect(actorContextService.createGuest).toHaveBeenCalledWith(
        'Test Guest'
      );
      expect(result).toEqual(guestContext);
    });

    it('should trim guest name from header', async () => {
      const payload: KratosPayload = {} as any;
      const req = { headers: { 'x-guest-name': '  Padded Name  ' } };

      await strategy.validate(req, payload);

      expect(actorContextService.createGuest).toHaveBeenCalledWith(
        'Padded Name'
      );
    });

    it('should return anonymous context when guest name is empty after trim', async () => {
      const payload: KratosPayload = {} as any;
      const req = { headers: { 'x-guest-name': '   ' } };

      const result = await strategy.validate(req, payload);

      // Empty trimmed string has length 0, so should fall through to anonymous
      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });

    it('should throw SessionExpiredException when session has expired', async () => {
      // Create a session that expired in the past
      const pastTime = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
      const payload: KratosPayload = {
        session: {
          expires_at: pastTime,
          identity: {
            id: 'identity-id',
            schema_id: 'default',
            schema_url: 'http://test.com/schema',
            traits: {},
            verifiable_addresses: [],
          },
        },
      } as any;
      const req = { headers: {} };

      await expect(strategy.validate(req, payload)).rejects.toThrow(
        SessionExpiredException
      );
    });

    it('should throw AuthenticationException when token has no alkemio_actor_id', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const payload: KratosPayload = {
        session: {
          expires_at: futureTime,
          identity: {
            id: 'identity-id',
            schema_id: 'default',
            schema_url: 'http://test.com/schema',
            traits: {},
            verifiable_addresses: [],
          },
        },
        // No alkemio_actor_id
      } as any;
      const req = { headers: {} };

      await expect(strategy.validate(req, payload)).rejects.toThrow(
        AuthenticationException
      );
    });

    it('should create actor context when token has valid session and alkemio_actor_id', async () => {
      const futureTime = Math.floor(Date.now() / 1000) + 3600;
      const payload: KratosPayload = {
        alkemio_actor_id: 'user-id',
        session: {
          expires_at: futureTime,
          identity: {
            id: 'identity-id',
            schema_id: 'default',
            schema_url: 'http://test.com/schema',
            traits: {},
            verifiable_addresses: [],
          },
        },
      } as any;
      const req = { headers: {} };

      authService.createActorContext.mockResolvedValue(authenticatedContext);

      const result = await strategy.validate(req, payload);

      expect(authService.createActorContext).toHaveBeenCalledWith(
        'user-id',
        expect.any(Object)
      );
      expect(result).toEqual(authenticatedContext);
    });
  });
});
