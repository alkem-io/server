import { AuthorizationCredential } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { User } from '@domain/community/user/user.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { getEntityManagerToken } from '@nestjs/typeorm';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi } from 'vitest';

describe('ActorContextService', () => {
  let service: ActorContextService;
  let mockEntityManager: any;
  let module: TestingModule;

  beforeEach(async () => {
    mockEntityManager = {
      findOneOrFail: vi.fn(),
      findOne: vi.fn(),
    };

    module = await Test.createTestingModule({
      providers: [
        ActorContextService,
        MockCacheManager,
        MockWinstonProvider,
        {
          provide: getEntityManagerToken('default'),
          useValue: mockEntityManager,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(ActorContextService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAnonymous', () => {
    it('returns an ActorContext with GLOBAL_ANONYMOUS credential', () => {
      const ctx = service.createAnonymous();
      expect(ctx).toBeInstanceOf(ActorContext);
      expect(ctx.isAnonymous).toBe(true);
      expect(ctx.credentials).toHaveLength(1);
      expect(ctx.credentials[0].type).toBe(
        AuthorizationCredential.GLOBAL_ANONYMOUS
      );
      expect(ctx.credentials[0].resourceID).toBe('');
    });
  });

  describe('createGuest', () => {
    it('returns an ActorContext with GLOBAL_GUEST credential and guest name', () => {
      const ctx = service.createGuest('test-guest');
      expect(ctx).toBeInstanceOf(ActorContext);
      expect(ctx.isAnonymous).toBe(false);
      expect(ctx.guestName).toBe('test-guest');
      expect(ctx.credentials).toHaveLength(1);
      expect(ctx.credentials[0].type).toBe(
        AuthorizationCredential.GLOBAL_GUEST
      );
      expect(ctx.credentials[0].resourceID).toBe('');
    });
  });

  describe('populateFromActorID', () => {
    it('sets actorID and credentials on the context', async () => {
      const ctx = new ActorContext();
      const mockCredentials = [{ type: 'global-admin', resourceID: '' }];

      const actorLookupService = module.get(ActorLookupService);
      (actorLookupService.getActorCredentialsOrFail as any).mockResolvedValue(
        mockCredentials
      );

      await service.populateFromActorID(ctx, 'actor-123');

      expect(ctx.actorID).toBe('actor-123');
      expect(ctx.credentials).toBe(mockCredentials);
    });
  });

  describe('buildForUser', () => {
    it('returns anonymous context when userId is empty', async () => {
      const ctx = await service.buildForUser('');
      expect(ctx.isAnonymous).toBe(true);
      expect(ctx.credentials[0].type).toBe(
        AuthorizationCredential.GLOBAL_ANONYMOUS
      );
    });

    it('returns context with credentials for a valid user', async () => {
      const mockUser = {
        id: 'user-1',
        authenticationID: 'kratos-id-1',
        credentials: [
          { type: 'global-admin', resourceID: 'res-1' },
          { type: 'space-member', resourceID: 'space-1' },
        ],
      } as unknown as User;

      mockEntityManager.findOneOrFail.mockResolvedValue(mockUser);

      const ctx = await service.buildForUser('user-1');

      expect(ctx.actorID).toBe('user-1');
      expect(ctx.authenticationID).toBe('kratos-id-1');
      expect(ctx.credentials).toHaveLength(2);
      expect(ctx.credentials[0].type).toBe('global-admin');
      expect(ctx.credentials[1].resourceID).toBe('space-1');
    });

    it('returns context with empty credentials when user has no credentials', async () => {
      const mockUser = {
        id: 'user-2',
        authenticationID: null,
        credentials: [],
      } as unknown as User;

      mockEntityManager.findOneOrFail.mockResolvedValue(mockUser);

      const ctx = await service.buildForUser('user-2');

      expect(ctx.actorID).toBe('user-2');
      expect(ctx.authenticationID).toBeUndefined();
      expect(ctx.credentials).toEqual([]);
    });

    it('throws when credentials are not loaded', async () => {
      const mockUser = {
        id: 'user-3',
        credentials: undefined,
      } as unknown as User;

      mockEntityManager.findOneOrFail.mockResolvedValue(mockUser);

      await expect(service.buildForUser('user-3')).rejects.toThrow(
        'Credentials not loaded for User'
      );
    });
  });

  describe('buildForActor', () => {
    it('returns anonymous context when actor is not found', async () => {
      mockEntityManager.findOne.mockResolvedValue(null);

      const ctx = await service.buildForActor('missing-id');

      expect(ctx.isAnonymous).toBe(true);
    });

    it('returns context with actor credentials', async () => {
      const mockActor = {
        id: 'actor-1',
        credentials: [{ type: 'space-admin', resourceID: 'space-1' }],
      } as unknown as Actor;

      mockEntityManager.findOne.mockResolvedValue(mockActor);

      const ctx = await service.buildForActor('actor-1');

      expect(ctx.actorID).toBe('actor-1');
      expect(ctx.isAnonymous).toBe(false);
      expect(ctx.credentials).toHaveLength(1);
      expect(ctx.credentials[0].type).toBe('space-admin');
    });

    it('handles null credentials on actor gracefully', async () => {
      const mockActor = {
        id: 'actor-2',
        credentials: null,
      } as unknown as Actor;

      mockEntityManager.findOne.mockResolvedValue(mockActor);

      const ctx = await service.buildForActor('actor-2');

      expect(ctx.credentials).toEqual([]);
    });
  });
});
