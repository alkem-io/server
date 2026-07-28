import { ActorType } from '@common/enums/actor.type';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { UserInformationVisibility } from '@common/enums/user.information.visibility';
import { ActorContext } from '@core/actor-context/actor.context';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Community } from '@domain/community/community/community.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { EntityManager } from 'typeorm';
import { ContributorCollectionService } from './contributor.collection.service';

// Privacy-critical server enforcement: type-selection filter (FR-007, SC-003)
// and members-only user-information visibility (FR-015/FR-017, SC-004).
describe('ContributorCollectionService', () => {
  let service: ContributorCollectionService;
  let roleSetService: RoleSetService;
  let communityResolver: CommunityResolverService;
  let entityManager: EntityManager;

  const roleSet = { id: 'role-set-1' } as any;
  const community = { id: 'community-1' } as any;

  const calloutWith = (
    contributorTypes: ActorType[],
    selection?: { mode: CalloutSelectionMode; selectedIds: string[] }
  ): ICallout =>
    ({
      id: 'callout-1',
      settings: {
        framing: {
          commentsEnabled: true,
          contributors: {
            contributorTypes,
            defaultContributorType: contributorTypes[0],
            defaultView: 'list',
          },
          selection,
        },
      },
    }) as unknown as ICallout;

  const spaceWithVisibility = (
    visibility?: UserInformationVisibility
  ): any => ({
    id: 'space-1',
    settings: { privacy: { userInformationVisibility: visibility } },
  });

  // The service calls entityManager.findOne twice: first for Community (to load
  // its RoleSet), then for Space. Return the community-with-roleSet for the
  // former and the given space for the latter.
  const mockFindOne = (space: any) =>
    vi
      .spyOn(entityManager, 'findOne')
      .mockImplementation((async (entity: any) =>
        entity === Community ? { id: 'community-1', roleSet } : space) as any);

  beforeEach(async () => {
    vi.restoreAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributorCollectionService,
        {
          provide: RoleSetService,
          useValue: {
            getUsersWithRole: vi.fn(),
            getOrganizationsWithRole: vi.fn(),
            getVirtualContributorsWithRole: vi.fn(),
            isMember: vi.fn(),
          },
        },
        {
          provide: CommunityResolverService,
          useValue: { getCommunityFromCollaborationCalloutOrFail: vi.fn() },
        },
        {
          provide: UrlGeneratorService,
          useValue: {
            generateUrlForProfile: vi.fn(),
            generateUrlForVC: vi.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: { findOne: vi.fn(), find: vi.fn().mockResolvedValue([]) },
        },
      ],
    }).compile();

    service = module.get(ContributorCollectionService);
    roleSetService = module.get(RoleSetService);
    communityResolver = module.get(CommunityResolverService);
    entityManager = module.get(EntityManager);

    vi.spyOn(
      communityResolver,
      'getCommunityFromCollaborationCalloutOrFail'
    ).mockResolvedValue(community);
    // Role lookups return one member each by default.
    vi.spyOn(roleSetService, 'getUsersWithRole').mockImplementation(
      async (_rs, role) => (role === 'member' ? ([{ id: 'u1' }] as any) : [])
    );
    vi.spyOn(roleSetService, 'getOrganizationsWithRole').mockImplementation(
      async (_rs, role) => (role === 'member' ? ([{ id: 'o1' }] as any) : [])
    );
    vi.spyOn(
      roleSetService,
      'getVirtualContributorsWithRole'
    ).mockResolvedValue([] as any);
  });

  describe('contributorCounts type-selection filter (FR-007)', () => {
    it('returns 0 users for an organizations-only callout, even for anonymous', async () => {
      mockFindOne(spaceWithVisibility());
      const anon = new ActorContext(); // actorID === '' (anonymous)

      const counts = await service.getContributorCounts(
        calloutWith([ActorType.ORGANIZATION]),
        anon
      );

      expect(counts.users).toBe(0);
      expect(counts.organizations).toBe(1);
      expect(counts.virtualContributors).toBe(0);
    });

    it('returns an empty set when querying a deselected type', async () => {
      mockFindOne(spaceWithVisibility());
      const anon = new ActorContext();

      const users = await service.getContributors(
        calloutWith([ActorType.ORGANIZATION]),
        ActorType.USER,
        anon
      );

      expect(users).toEqual([]);
    });
  });

  describe('members-only user-information visibility (FR-015/FR-017)', () => {
    it('hides member USERS from a non-member when members-only', async () => {
      mockFindOne(spaceWithVisibility(UserInformationVisibility.MEMBERS_ONLY));
      vi.spyOn(roleSetService, 'isMember').mockResolvedValue(false);
      const viewer = new ActorContext();
      viewer.actorID = 'non-member';

      const counts = await service.getContributorCounts(
        calloutWith([ActorType.USER, ActorType.ORGANIZATION]),
        viewer
      );

      // Users hidden, organizations unaffected.
      expect(counts.users).toBe(0);
      expect(counts.organizations).toBe(1);

      const users = await service.getContributors(
        calloutWith([ActorType.USER]),
        ActorType.USER,
        viewer
      );
      expect(users).toEqual([]);
    });

    it('hides member USERS from anonymous viewers when members-only', async () => {
      mockFindOne(spaceWithVisibility(UserInformationVisibility.MEMBERS_ONLY));
      const isMemberSpy = vi.spyOn(roleSetService, 'isMember');
      const anon = new ActorContext();

      const counts = await service.getContributorCounts(
        calloutWith([ActorType.USER]),
        anon
      );

      expect(counts.users).toBe(0);
      // Anonymous is short-circuited as non-member without a membership query.
      expect(isMemberSpy).not.toHaveBeenCalled();
    });

    it('shows member USERS to a member when members-only', async () => {
      mockFindOne(spaceWithVisibility(UserInformationVisibility.MEMBERS_ONLY));
      vi.spyOn(roleSetService, 'isMember').mockResolvedValue(true);
      const member = new ActorContext();
      member.actorID = 'a-member';

      const counts = await service.getContributorCounts(
        calloutWith([ActorType.USER]),
        member
      );

      expect(counts.users).toBe(1);
    });
  });

  // --- Selection settings (workspace#025, T010) ---
  describe('CUSTOM selection mode intersection (T010 / FR-007)', () => {
    const anon = new ActorContext();

    it('[S1] legacy-shaped callout without selection block ⇒ AUTO behavior (byte-identical)', async () => {
      mockFindOne(spaceWithVisibility());
      // calloutWith() with no selection = undefined → read-time AUTO default
      const counts = await service.getContributorCounts(
        calloutWith([ActorType.ORGANIZATION]),
        anon
      );
      expect(counts.organizations).toBe(1); // u1 returned by default mock
    });

    it('[S2] AUTO mode with non-empty selectedIds ⇒ selectedIds are inert (full set returned)', async () => {
      mockFindOne(spaceWithVisibility());
      // AUTO + some ids → filter NOT applied
      const counts = await service.getContributorCounts(
        calloutWith([ActorType.ORGANIZATION], {
          mode: CalloutSelectionMode.AUTO,
          selectedIds: ['some-other-id'],
        }),
        anon
      );
      expect(counts.organizations).toBe(1); // full set
    });

    it('[S3] CUSTOM + members-only space + anonymous viewer → selected member users NOT returned', async () => {
      mockFindOne(spaceWithVisibility(UserInformationVisibility.MEMBERS_ONLY));
      vi.spyOn(roleSetService, 'isMember').mockResolvedValue(false);
      // 'u1' would be selected, but members-only hides all users from anon
      const result = await service.getContributors(
        calloutWith([ActorType.USER], {
          mode: CalloutSelectionMode.CUSTOM,
          selectedIds: ['u1'],
        }),
        ActorType.USER,
        anon // anonymous
      );
      expect(result).toEqual([]);
    });

    it('[S4] CUSTOM + selected id absent from RoleSet (departed) ⇒ silently dropped', async () => {
      mockFindOne(spaceWithVisibility());
      // u1 is the only "member" in the RoleSet (default mock), but we select 'other-id'
      const result = await service.getContributors(
        calloutWith([ActorType.USER], {
          mode: CalloutSelectionMode.CUSTOM,
          selectedIds: ['other-id'],
        }),
        ActorType.USER,
        anon
      );
      expect(result).toEqual([]);
    });

    it('[S4] all selected ids departed → returns [] (empty state, never fallback)', async () => {
      mockFindOne(spaceWithVisibility());
      vi.spyOn(roleSetService, 'getUsersWithRole').mockResolvedValue([]);
      const result = await service.getContributors(
        calloutWith([ActorType.USER], {
          mode: CalloutSelectionMode.CUSTOM,
          selectedIds: ['gone-1', 'gone-2'],
        }),
        ActorType.USER,
        anon
      );
      expect(result).toEqual([]);
    });

    it('[S5] counts equal rendered set per type (CUSTOM filters count too)', async () => {
      mockFindOne(spaceWithVisibility());
      // Default mock returns [{ id: 'u1' }] for USER member
      // We select 'u1' → count should be 1
      const countsWithSelection = await service.getContributorCounts(
        calloutWith([ActorType.USER], {
          mode: CalloutSelectionMode.CUSTOM,
          selectedIds: ['u1'],
        }),
        anon
      );
      expect(countsWithSelection.users).toBe(1);

      // We select 'non-member' → count should be 0
      const countsEmpty = await service.getContributorCounts(
        calloutWith([ActorType.USER], {
          mode: CalloutSelectionMode.CUSTOM,
          selectedIds: ['non-member'],
        }),
        anon
      );
      expect(countsEmpty.users).toBe(0);
    });

    it('[S6] result order equals the AUTO order filtered (leads first, then alphabetical)', async () => {
      mockFindOne(spaceWithVisibility());
      // Mock: LEAD role → u1; MEMBER → u2, u3
      vi.spyOn(roleSetService, 'getUsersWithRole').mockImplementation(
        async (_rs, role) =>
          role === 'lead'
            ? ([{ id: 'u1' }] as any)
            : role === 'member'
              ? ([{ id: 'u2' }, { id: 'u3' }] as any)
              : []
      );

      // Select only u2 (plain member) and u1 (lead) — ordering: leads first
      const result = await service.getContributors(
        calloutWith([ActorType.USER], {
          mode: CalloutSelectionMode.CUSTOM,
          selectedIds: ['u2', 'u1'],
        }),
        ActorType.USER,
        anon
      );
      // IDs present; profiles will be undefined (entityManager.find returns [])
      // but the important thing is the order: u1 (lead rank 2) before u2 (member rank 1)
      expect(result.map(r => r.id)).toEqual(['u1', 'u2']);
    });

    it('[FR-011] id outside included contributorTypes ⇒ type-filter still applies', async () => {
      mockFindOne(spaceWithVisibility());
      // Callout only includes ORGANIZATION; we query USER → type filter returns []
      // before selection even runs
      const result = await service.getContributors(
        calloutWith([ActorType.ORGANIZATION], {
          mode: CalloutSelectionMode.CUSTOM,
          selectedIds: ['u1'],
        }),
        ActorType.USER, // querying USER, which is not in contributorTypes
        anon
      );
      expect(result).toEqual([]);
    });
  });
});
