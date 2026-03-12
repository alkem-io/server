import { AuthorizationCredential } from '@common/enums';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mocked, vi } from 'vitest';
import { ActorContextService } from './actor.context.service';

describe('ActorContextService', () => {
  let service: ActorContextService;
  let actorLookupService: Mocked<ActorLookupService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActorContextService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(token => {
        if (token === ActorLookupService) {
          return {
            getActorCredentialsOrFail: vi.fn().mockResolvedValue([]),
          };
        }
        return defaultMockerFactory(token);
      })
      .compile();

    service = module.get(ActorContextService);
    actorLookupService = module.get(ActorLookupService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAnonymous', () => {
    it('should create anonymous actor context', () => {
      const ctx = service.createAnonymous();

      expect(ctx.isAnonymous).toBe(true);
      expect(ctx.credentials).toHaveLength(1);
      expect(ctx.credentials[0].type).toBe(
        AuthorizationCredential.GLOBAL_ANONYMOUS
      );
      expect(ctx.credentials[0].resourceID).toBe('');
    });
  });

  describe('createGuest', () => {
    it('should create guest actor context with name', () => {
      const ctx = service.createGuest('Test Guest');

      expect(ctx.isAnonymous).toBe(false);
      expect(ctx.guestName).toBe('Test Guest');
      expect(ctx.credentials).toHaveLength(1);
      expect(ctx.credentials[0].type).toBe(
        AuthorizationCredential.GLOBAL_GUEST
      );
    });
  });

  describe('populateFromActorID', () => {
    it('should populate context with credentials from actorID', async () => {
      const mockCredentials = [
        {
          type: AuthorizationCredential.GLOBAL_REGISTERED,
          resourceID: '',
        },
      ] as any;
      actorLookupService.getActorCredentialsOrFail.mockResolvedValue(
        mockCredentials
      );

      const ctx = service.createAnonymous();
      await service.populateFromActorID(ctx, 'actor-123');

      expect(ctx.actorID).toBe('actor-123');
      expect(ctx.credentials).toEqual(mockCredentials);
      expect(actorLookupService.getActorCredentialsOrFail).toHaveBeenCalledWith(
        'actor-123'
      );
    });
  });
});
