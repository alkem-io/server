import ConfigUtils from '@config/config.utils';
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
    actorId: 'user-id',
    guestName: undefined,
    credentials: [],
    authenticationID: 'test-id',
    expiry: new Date('2023-12-31T23:59:59Z').getTime(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthenticationService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(token => {
        if (token === ConfigService) {
          return ConfigServiceMock;
        }
        if (token === ActorContextCacheService) {
          return {
            getByActorId: vi.fn(),
            setByActorId: vi.fn(),
            deleteByActorId: vi.fn(),
          };
        }
        if (token === ActorContextService) {
          return {
            createAnonymous: vi.fn(),
            createGuest: vi.fn(),
            populateFromActorId: vi.fn(),
          };
        }
        if (token === KratosService) {
          return {
            getSession: vi.fn(),
            getBearerToken: vi.fn(),
            tryExtendSession: vi.fn(),
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
    vi.clearAllMocks();
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
      actorContextCacheService.getByActorId.mockResolvedValue(undefined);
      actorContextService.populateFromActorId.mockResolvedValue(undefined);
      actorContextCacheService.setByActorId.mockImplementation(ctx =>
        Promise.resolve(ctx)
      );

      const result = await service.getActorContext({
        authorization: 'Bearer token',
      });

      expect(kratosService.getSession).toHaveBeenCalledWith(
        'Bearer token',
        undefined
      );
      // Uses actorId from metadata_public.alkemio_actor_id
      expect(actorContextCacheService.getByActorId).toHaveBeenCalledWith(
        'user-id'
      );
      expect(actorContextService.populateFromActorId).toHaveBeenCalled();
      expect(result.isAnonymous).toBe(false);
    });

    it('should return anonymous when identity has no alkemio_actor_id in metadata_public', async () => {
      const identityWithoutActorId = {
        ...mockOryIdentity,
        metadata_public: {},
      };
      const sessionWithoutActorId = {
        ...mockSession,
        identity: identityWithoutActorId,
      };
      const anonymousContext = { ...mockActorContext, isAnonymous: true };

      kratosService.getSession.mockResolvedValue(sessionWithoutActorId);
      actorContextService.createAnonymous.mockReturnValue(anonymousContext);

      const result = await service.getActorContext({
        authorization: 'Bearer token',
      });

      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });
  });

  describe('createActorContext', () => {
    it('should return anonymous context when no actorId provided', async () => {
      const anonymousContext = { ...mockActorContext, isAnonymous: true };
      actorContextService.createAnonymous.mockReturnValue(anonymousContext);

      const result = await service.createActorContext('');

      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
    });

    it('should return cached context if available', async () => {
      const cachedContext = { ...mockActorContext };
      actorContextCacheService.getByActorId.mockResolvedValue(cachedContext);

      const result = await service.createActorContext('user-id', mockSession);

      expect(actorContextCacheService.getByActorId).toHaveBeenCalledWith(
        'user-id'
      );
      expect(result).toEqual(cachedContext);
      // Expiry should be updated from session
      expect(result.expiry).toEqual(new Date('2023-12-31T23:59:59Z').getTime());
    });

    it('should create new context when not in cache and load credentials', async () => {
      actorContextCacheService.getByActorId.mockResolvedValue(undefined);
      actorContextService.populateFromActorId.mockResolvedValue(undefined);
      actorContextCacheService.setByActorId.mockImplementation(ctx =>
        Promise.resolve(ctx)
      );

      const result = await service.createActorContext('user-id', mockSession);

      expect(actorContextCacheService.getByActorId).toHaveBeenCalledWith(
        'user-id'
      );
      expect(actorContextService.populateFromActorId).toHaveBeenCalled();
      expect(actorContextCacheService.setByActorId).toHaveBeenCalled();
      expect(result.isAnonymous).toBe(false);
      expect(result.expiry).toEqual(new Date('2023-12-31T23:59:59Z').getTime());
    });

    it('should set expiry from session when creating context', async () => {
      actorContextCacheService.getByActorId.mockResolvedValue(undefined);
      actorContextService.populateFromActorId.mockResolvedValue(undefined);
      actorContextCacheService.setByActorId.mockImplementation(ctx =>
        Promise.resolve(ctx)
      );

      const result = await service.createActorContext('user-id', mockSession);

      expect(result.expiry).toEqual(new Date('2023-12-31T23:59:59Z').getTime());
    });
  });

  describe('extendSession', () => {
    it('should extend session successfully', async () => {
      const bearerToken = 'admin-bearer-token';
      kratosService.getBearerToken.mockResolvedValue(bearerToken);
      kratosService.tryExtendSession.mockResolvedValue();

      await service.extendSession(mockSession);

      expect(kratosService.getBearerToken).toHaveBeenCalled();
      expect(kratosService.tryExtendSession).toHaveBeenCalledWith(
        mockSession,
        bearerToken
      );
    });
  });

  describe('shouldExtendSession', () => {
    beforeEach(() => {
      // Mock the constructor call that sets extendSessionMinRemainingTTL
      vi.spyOn(service as any, 'parseEarliestPossibleExtend').mockReturnValue(
        300000
      ); // 5 minutes
      (service as any).extendSessionMinRemainingTTL = 300000;
    });

    it('should return false when session has no expires_at', () => {
      const sessionWithoutExpiry = { ...mockSession, expires_at: undefined };

      const result = service.shouldExtendSession(sessionWithoutExpiry);

      expect(result).toBe(false);
    });

    it('should return false when extendSessionMinRemainingTTL is not set', () => {
      (service as any).extendSessionMinRemainingTTL = undefined;

      const result = service.shouldExtendSession(mockSession);

      expect(result).toBe(false);
    });

    it('should return true when extendSessionMinRemainingTTL is -1 (lifespan)', () => {
      (service as any).extendSessionMinRemainingTTL = -1;

      const result = service.shouldExtendSession(mockSession);

      expect(result).toBe(true);
    });

    it('should return true when session should be extended', () => {
      // Create a session that expires soon (less than the minimum remaining TTL)
      const soonExpiringSession = {
        ...mockSession,
        expires_at: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
      };
      (service as any).extendSessionMinRemainingTTL = 300000; // 5 minutes

      const result = service.shouldExtendSession(soonExpiringSession);

      expect(result).toBe(true);
    });

    it('should return false when session should not be extended yet', () => {
      // Create a session that expires far in the future
      const farExpiringSession = {
        ...mockSession,
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      };
      (service as any).extendSessionMinRemainingTTL = 300000; // 5 minutes

      const result = service.shouldExtendSession(farExpiringSession);

      expect(result).toBe(false);
    });
  });

  describe('parseEarliestPossibleExtend', () => {
    it('should return -1 for "lifespan" value', () => {
      const result = (service as any).parseEarliestPossibleExtend('lifespan');

      expect(result).toBe(-1);
    });
    it('should parse HMS string correctly', () => {
      // Mock ConfigUtils.parseHMSString to return 300 seconds (5 minutes)
      const mockConfigUtils = ConfigUtils as Mocked<typeof ConfigUtils>;
      mockConfigUtils.parseHMSString = vi.fn().mockReturnValue(300);

      const result = (service as any).parseEarliestPossibleExtend('5m');

      expect(result).toBe(300000); // 300 seconds * 1000 = 300,000 milliseconds
    });

    it('should return undefined for invalid HMS string', () => {
      const mockConfigUtils = ConfigUtils as Mocked<typeof ConfigUtils>;
      mockConfigUtils.parseHMSString = vi.fn().mockReturnValue(undefined);

      const result = (service as any).parseEarliestPossibleExtend('invalid');

      expect(result).toBeUndefined();
    });
    it('should return undefined for non-string values', () => {
      const result = (service as any).parseEarliestPossibleExtend(123);

      expect(result).toBeUndefined();
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
        earliest_possible_extend: '5m',
      };
    }
    if (key === 'ssi.enabled') {
      return false;
    }
    return {};
  }),
};
