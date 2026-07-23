import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextCacheService } from '@core/actor-context/actor.context.cache.service';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { AuthenticationService } from './authentication.service';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let actorContextCacheService: Mocked<ActorContextCacheService>;
  let actorContextService: Mocked<ActorContextService>;

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

        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(AuthenticationService);
    actorContextCacheService = module.get(ActorContextCacheService);
    actorContextService = module.get(ActorContextService);
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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

      const result = await service.createActorContext('user-id');

      expect(actorContextCacheService.getByActorID).toHaveBeenCalledWith(
        'user-id'
      );
      expect(result).toEqual(cachedContext);
    });

    it('should create new context when not in cache and load credentials', async () => {
      actorContextCacheService.getByActorID.mockResolvedValue(undefined);
      actorContextService.populateFromActorID.mockResolvedValue(undefined);
      actorContextCacheService.setByActorID.mockImplementation(ctx =>
        Promise.resolve(ctx)
      );

      const result = await service.createActorContext('user-id');

      expect(actorContextCacheService.getByActorID).toHaveBeenCalledWith(
        'user-id'
      );
      expect(actorContextService.populateFromActorID).toHaveBeenCalled();
      expect(actorContextCacheService.setByActorID).toHaveBeenCalled();
      expect(result.isAnonymous).toBe(false);
    });

    it('should fall back to anonymous when the actor is not found in the DB', async () => {
      const anonymousContext = { ...mockActorContext, isAnonymous: true };
      actorContextCacheService.getByActorID.mockResolvedValue(undefined);
      actorContextService.populateFromActorID.mockRejectedValue(
        new Error('Actor not found')
      );
      actorContextService.createAnonymous.mockReturnValue(anonymousContext);

      const result = await service.createActorContext('stale-actor-id');

      expect(actorContextService.createAnonymous).toHaveBeenCalled();
      expect(actorContextCacheService.setByActorID).not.toHaveBeenCalled();
      expect(result).toEqual(anonymousContext);
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
