import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextCacheService } from '@core/actor-context/actor.context.cache.service';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Session } from '@ory/kratos-client';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { AuthenticationService } from './authentication.service';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let actorContextCacheService: Mocked<ActorContextCacheService>;
  let actorContextService: Mocked<ActorContextService>;
  let kratosService: Mocked<KratosService>;

  const mockOryIdentity: OryDefaultIdentitySchema = {
    id: 'test-id',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    schema_id: 'default',
    schema_url: 'http://test.com/schema',
    state: 'active',
    state_changed_at: '2023-01-01T00:00:00Z',
    metadata_public: {
      alkemio_actor_id: 'user-id',
    },
    traits: {
      accepted_terms: true,
      email: 'test@example.com',
      name: {
        first: 'John',
        last: 'Doe',
      },
      picture: 'http://example.com/avatar.jpg',
    },
    verifiable_addresses: [
      {
        id: 'addr-id',
        value: 'test@example.com',
        verified: true,
        verified_at: '2023-01-01T00:00:00Z',
        via: 'email',
        status: 'completed',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ],
    recovery_addresses: [
      {
        id: 'recovery-id',
        value: 'test@example.com',
        via: 'email',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ],
  };

  const mockSession: Session = {
    id: 'session-id',
    active: true,
    expires_at: '2023-12-31T23:59:59Z',
    authenticated_at: '2023-01-01T00:00:00Z',
    issued_at: '2023-01-01T00:00:00Z',
    identity: mockOryIdentity,
  };

  const mockActorContext: ActorContext = {
    isAnonymous: false,
    isGuest: false,
    actorID: 'user-id',
    guestName: undefined,
    credentials: [],
    authenticationID: 'test-id',
    expiry: new Date('2023-12-31T23:59:59Z').getTime(),
  };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthenticationService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return ConfigServiceMock;
        }
        if (token === ActorContextCacheService) {
          return {
            getByActorID: vi.fn(),
            setByActorID: vi.fn(),
            deleteByActorID: vi.fn(),
          };
        }
        if (token === ActorContextService) {
          return {
            createAnonymous: vi.fn(),
            createGuest: vi.fn(),
            populateFromActorID: vi.fn(),
          };
        }
        if (token === KratosService) {
          return {
            getSession: vi.fn(),
          };
        }

        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(AuthenticationService);
    actorContextCacheService = module.get(ActorContextCacheService);
    actorContextService = module.get(ActorContextService);
    kratosService = module.get(KratosService);
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getActorContext', () => {
    it('should return anonymous context when no session is found and no guest name', async () => {
      const anonymousContext = { ...mockActorContext, isAnonymous: true };
      kratosService.getSession.mockRejectedValue(new Error('No session'));
      actorContextService.createAnonymous.mockReturnValue(anonymousContext);

      const result = await service.getActorContext({ cookie: 'test-cookie' });

      expect(kratosService.getSession).toHaveBeenCalledWith(
        undefined,
        'test-cookie'
      );
      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });

    it('should return guest context when no session is found but guest name is provided', async () => {
      const guestContext = { ...mockActorContext, guestName: 'Guest User' };
      kratosService.getSession.mockRejectedValue(new Error('No session'));
      actorContextService.createGuest.mockReturnValue(guestContext);

      const result = await service.getActorContext({
        cookie: 'test-cookie',
        guestName: 'Guest User',
      });

      expect(kratosService.getSession).toHaveBeenCalledWith(
        undefined,
        'test-cookie'
      );
      expect(actorContextService.createGuest).toHaveBeenCalledWith(
        'Guest User'
      );
      expect(result).toEqual(guestContext);
    });

    it('should return anonymous context when session has no identity and no guest name', async () => {
      const sessionWithoutIdentity = { ...mockSession, identity: undefined };
      const anonymousContext = { ...mockActorContext, isAnonymous: true };

      kratosService.getSession.mockResolvedValue(sessionWithoutIdentity);
      actorContextService.createAnonymous.mockReturnValue(anonymousContext);

      const result = await service.getActorContext({
        authorization: 'Bearer token',
      });

      expect(kratosService.getSession).toHaveBeenCalledWith(
        'Bearer token',
        undefined
      );
      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });

    it('should return guest context when session has no identity but guest name is provided', async () => {
      const sessionWithoutIdentity = { ...mockSession, identity: undefined };
      const guestContext = { ...mockActorContext, guestName: 'Guest User' };

      kratosService.getSession.mockResolvedValue(sessionWithoutIdentity);
      actorContextService.createGuest.mockReturnValue(guestContext);

      const result = await service.getActorContext({
        authorization: 'Bearer token',
        guestName: 'Guest User',
      });

      expect(kratosService.getSession).toHaveBeenCalledWith(
        'Bearer token',
        undefined
      );
      expect(actorContextService.createGuest).toHaveBeenCalledWith(
        'Guest User'
      );
      expect(result).toEqual(guestContext);
    });

    it('should create context when session has valid identity with metadata_public', async () => {
      kratosService.getSession.mockResolvedValue(mockSession);
      actorContextCacheService.getByActorID.mockResolvedValue(undefined);
      actorContextService.populateFromActorID.mockResolvedValue(undefined);
      actorContextCacheService.setByActorID.mockImplementation(ctx =>
        Promise.resolve(ctx)
      );

      const result = await service.getActorContext({
        authorization: 'Bearer token',
      });

      expect(kratosService.getSession).toHaveBeenCalledWith(
        'Bearer token',
        undefined
      );
      // Uses actorID from metadata_public.alkemio_actor_id
      expect(actorContextCacheService.getByActorID).toHaveBeenCalledWith(
        'user-id'
      );
      expect(actorContextService.populateFromActorID).toHaveBeenCalled();
      expect(result.isAnonymous).toBe(false);
    });

    it('should return anonymous when identity has no alkemio_actor_id in metadata_public', async () => {
      const identityWithoutActorID = {
        ...mockOryIdentity,
        metadata_public: {},
      };
      const sessionWithoutActorID = {
        ...mockSession,
        identity: identityWithoutActorID,
      };
      const anonymousContext = { ...mockActorContext, isAnonymous: true };

      kratosService.getSession.mockResolvedValue(sessionWithoutActorID);
      actorContextService.createAnonymous.mockReturnValue(anonymousContext);

      const result = await service.getActorContext({
        authorization: 'Bearer token',
      });

      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });
  });

  describe('createActorContext', () => {
    it('should return anonymous context when no actorID provided', async () => {
      const anonymousContext = { ...mockActorContext, isAnonymous: true };
      actorContextService.createAnonymous.mockReturnValue(anonymousContext);

      const result = await service.createActorContext('');

      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });

    it('should return cached context if available', async () => {
      const cachedContext = { ...mockActorContext };
      actorContextCacheService.getByActorID.mockResolvedValue(cachedContext);

      const result = await service.createActorContext('user-id', mockSession);

      expect(actorContextCacheService.getByActorID).toHaveBeenCalledWith(
        'user-id'
      );
      expect(result).toEqual(cachedContext);
      // Expiry should be updated from session
      expect(result.expiry).toEqual(new Date('2023-12-31T23:59:59Z').getTime());
    });

    it('should create new context when not in cache and load credentials', async () => {
      actorContextCacheService.getByActorID.mockResolvedValue(undefined);
      actorContextService.populateFromActorID.mockResolvedValue(undefined);
      actorContextCacheService.setByActorID.mockImplementation(ctx =>
        Promise.resolve(ctx)
      );

      const result = await service.createActorContext('user-id', mockSession);

      expect(actorContextCacheService.getByActorID).toHaveBeenCalledWith(
        'user-id'
      );
      expect(actorContextService.populateFromActorID).toHaveBeenCalled();
      expect(actorContextCacheService.setByActorID).toHaveBeenCalled();
      expect(result.isAnonymous).toBe(false);
      expect(result.expiry).toEqual(new Date('2023-12-31T23:59:59Z').getTime());
    });

    it('should set expiry from session when creating context', async () => {
      actorContextCacheService.getByActorID.mockResolvedValue(undefined);
      actorContextService.populateFromActorID.mockResolvedValue(undefined);
      actorContextCacheService.setByActorID.mockImplementation(ctx =>
        Promise.resolve(ctx)
      );

      const result = await service.createActorContext('user-id', mockSession);

      expect(result.expiry).toEqual(new Date('2023-12-31T23:59:59Z').getTime());
    });
  });
});

const ConfigServiceMock = {
  get: vi.fn().mockImplementation((key: string) => {
    if (key === 'identity.authentication.providers.ory') {
      return {
        kratos_public_base_url_server: 'mockUrl',
        kratos_admin_base_url_server: 'mockUrl',
        admin_service_account: {
          username: 'mock',
          password: 'mock',
        },
      };
    }
    if (key === 'ssi.enabled') {
      return false;
    }
    return {};
  }),
};
