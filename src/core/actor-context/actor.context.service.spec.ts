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
    vi.restoreAllMocks();

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
      expect(ctx.isGuest).toBe(false);
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
      expect(ctx.isGuest).toBe(true);
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

    // 027-platform-role-redesign (T056/T070g, research D8, FR-002/FR-031):
    // an ORGANIZATION_ADMIN/OWNER inherits that organization's OWN
    // `feature-*` credentials; `platform-*` credentials are NEVER expanded
    // this way (D2's prefix filter is load-bearing).
    it('expands an ORGANIZATION_ADMIN actor with the organization`s feature-* credentials', async () => {
      const ctx = new ActorContext();
      const actorLookupService = module.get(ActorLookupService);
      (actorLookupService.getActorCredentialsOrFail as any)
        .mockResolvedValueOnce([
          {
            type: AuthorizationCredential.ORGANIZATION_ADMIN,
            resourceID: 'org-1',
          },
        ])
        .mockResolvedValueOnce([
          {
            type: AuthorizationCredential.FEATURE_BETA_TESTER,
            resourceID: 'org-1',
          },
          // Not org-scoped, not feature-*  — must NOT be pulled in.
          { type: AuthorizationCredential.GLOBAL_REGISTERED, resourceID: '' },
        ]);

      await service.populateFromActorID(ctx, 'user-1');

      expect(ctx.credentials).toEqual([
        {
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: 'org-1',
        },
        {
          type: AuthorizationCredential.FEATURE_BETA_TESTER,
          resourceID: 'org-1',
        },
      ]);
    });

    it('does NOT expand platform-* credentials from an administered organization (D2 prefix filter)', async () => {
      const ctx = new ActorContext();
      const actorLookupService = module.get(ActorLookupService);
      (actorLookupService.getActorCredentialsOrFail as any)
        .mockResolvedValueOnce([
          {
            type: AuthorizationCredential.ORGANIZATION_OWNER,
            resourceID: 'org-2',
          },
        ])
        .mockResolvedValueOnce([
          {
            type: AuthorizationCredential.PLATFORM_SUPPORT,
            resourceID: 'org-2',
          },
        ]);

      await service.populateFromActorID(ctx, 'user-2');

      expect(ctx.credentials).toEqual([
        {
          type: AuthorizationCredential.ORGANIZATION_OWNER,
          resourceID: 'org-2',
        },
      ]);
    });

    it('leaves a plain ORGANIZATION_ASSOCIATE unexpanded', async () => {
      const ctx = new ActorContext();
      const mockCredentials = [
        {
          type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
          resourceID: 'org-3',
        },
      ];
      const actorLookupService = module.get(ActorLookupService);
      (actorLookupService.getActorCredentialsOrFail as any).mockResolvedValue(
        mockCredentials
      );

      await service.populateFromActorID(ctx, 'user-3');

      expect(ctx.credentials).toBe(mockCredentials);
    });

    it('skips a dangling ORGANIZATION_ADMIN resourceID without failing the whole build', async () => {
      const ctx = new ActorContext();
      const actorLookupService = module.get(ActorLookupService);
      (actorLookupService.getActorCredentialsOrFail as any)
        .mockResolvedValueOnce([
          {
            type: AuthorizationCredential.ORGANIZATION_ADMIN,
            resourceID: 'org-stale',
          },
        ])
        .mockRejectedValueOnce(new Error('Actor not found'));

      await service.populateFromActorID(ctx, 'user-4');

      expect(ctx.credentials).toEqual([
        {
          type: AuthorizationCredential.ORGANIZATION_ADMIN,
          resourceID: 'org-stale',
        },
      ]);
    });
  });

  describe('buildForUser', () => {
    it('returns anonymous context when userId is empty', async () => {
      const ctx = await service.buildForUser('');
      expect(ctx.isAnonymous).toBe(true);
      expect(ctx.isGuest).toBe(false);
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
      expect(ctx.isGuest).toBe(false);
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
      expect(ctx.isGuest).toBe(false);
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

  describe('resolveActorContext', () => {
    it('returns a guest context when guestName is provided with an anonymous actorID', async () => {
      const ctx = await service.resolveActorContext('', '  Nick  ');

      expect(ctx.isAnonymous).toBe(false);
      expect(ctx.isGuest).toBe(true);
      expect(ctx.guestName).toBe('Nick');
      expect(ctx.credentials[0].type).toBe(
        AuthorizationCredential.GLOBAL_GUEST
      );
    });

    it('generates a default guest name when guestName is whitespace-only', async () => {
      const ctx = await service.resolveActorContext('', '   ');

      expect(ctx.guestName).toMatch(/^Guest collaborator [0-9a-f]{8}$/);
      expect(ctx.credentials[0].type).toBe(
        AuthorizationCredential.GLOBAL_GUEST
      );
    });

    it('returns an anonymous context when no guestName and actorID is anonymous', async () => {
      const ctx = await service.resolveActorContext('');

      expect(ctx.isAnonymous).toBe(true);
      expect(ctx.isGuest).toBe(false);
      expect(ctx.credentials[0].type).toBe(
        AuthorizationCredential.GLOBAL_ANONYMOUS
      );
    });

    it('treats a whitespace-only actorID as anonymous', async () => {
      const ctx = await service.resolveActorContext('   ');

      expect(ctx.isAnonymous).toBe(true);
      expect(ctx.isGuest).toBe(false);
      expect(ctx.credentials[0].type).toBe(
        AuthorizationCredential.GLOBAL_ANONYMOUS
      );
    });

    it('returns an anonymous context when guestName is an empty string and actorID is anonymous', async () => {
      const ctx = await service.resolveActorContext('', '');

      expect(ctx.isAnonymous).toBe(true);
      expect(ctx.isGuest).toBe(false);
      expect(ctx.guestName).toBeUndefined();
      expect(ctx.credentials[0].type).toBe(
        AuthorizationCredential.GLOBAL_ANONYMOUS
      );
    });

    it('builds a user context for a known actorID, ignoring guestName', async () => {
      const mockUser = {
        id: 'user-1',
        authenticationID: 'kratos-id-1',
        credentials: [{ type: 'space-admin', resourceID: 'space-1' }],
      } as unknown as User;
      mockEntityManager.findOneOrFail.mockResolvedValue(mockUser);

      const ctx = await service.resolveActorContext('user-1', 'Nick');

      expect(ctx.actorID).toBe('user-1');
      expect(ctx.isAnonymous).toBe(false);
      expect(ctx.isGuest).toBe(false);
      expect(ctx.guestName).toBeUndefined();
      expect(ctx.authenticationID).toBe('kratos-id-1');
      expect(ctx.credentials[0].type).toBe('space-admin');
    });

    it('builds a user context for a known actorID without guestName', async () => {
      const mockUser = {
        id: 'user-2',
        authenticationID: null,
        credentials: [],
      } as unknown as User;
      mockEntityManager.findOneOrFail.mockResolvedValue(mockUser);

      const ctx = await service.resolveActorContext('user-2');

      expect(ctx.actorID).toBe('user-2');
      expect(ctx.isGuest).toBe(false);
      expect(ctx.credentials).toEqual([]);
    });

    it('rejects for an unknown actorID', async () => {
      mockEntityManager.findOneOrFail.mockRejectedValue(
        new Error('EntityNotFoundError')
      );

      await expect(
        service.resolveActorContext('missing-actor')
      ).rejects.toThrow('EntityNotFoundError');
    });
  });
});
