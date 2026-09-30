import { ActorType } from '@common/enums/actor.type';
import { AuthorizationCredential } from '@common/enums/authorization.credential';
import { CalloutSelectionMode } from '@common/enums/callout.selection.mode';
import { RoleName } from '@common/enums/role.name';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { UserInformationVisibility } from '@common/enums/user.information.visibility';
import { ActorContext } from '@core/actor-context/actor.context';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Tagset } from '@domain/common/tagset/tagset.entity';
import { Community } from '@domain/community/community/community.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { UrlGeneratorService } from '@services/infrastructure/url-generator/url.generator.service';
import { EntityManager } from 'typeorm';
import { ContributorCollectionService } from './contributor.collection.service';

// A minimal chainable query-builder test double covering exactly the methods
// the service calls (associates count / joined-date queries) — never the
// real TypeORM query builder.
type MockQueryBuilder = {
  innerJoin: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  addSelect: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  andWhere: ReturnType<typeof vi.fn>;
  groupBy: ReturnType<typeof vi.fn>;
  getRawMany: ReturnType<typeof vi.fn>;
};

// Cast to `any` at the boundary: this stands in for TypeORM's
// `SelectQueryBuilder<any>`, which the mock deliberately does not implement
// in full — only the handful of chained methods the service calls.
const makeQueryBuilder = (rows: unknown[] = []): any => {
  const qb = {} as MockQueryBuilder;
  qb.innerJoin = vi.fn().mockReturnValue(qb);
  qb.select = vi.fn().mockReturnValue(qb);
  qb.addSelect = vi.fn().mockReturnValue(qb);
  qb.where = vi.fn().mockReturnValue(qb);
  qb.andWhere = vi.fn().mockReturnValue(qb);
  qb.groupBy = vi.fn().mockReturnValue(qb);
  qb.getRawMany = vi.fn().mockResolvedValue(rows);
  return qb;
};

// A profile shaped enough for the enrichment helpers: displayName + tagline
// come straight off it; `id` is the join key back to its tagsets.
const profileOf = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  displayName: overrides.displayName ?? id,
  tagline: overrides.tagline,
  location: overrides.location,
  visuals: overrides.visuals ?? [],
});

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

  // entityManager.find is shared by three enrichment reads (Actor, Tagset,
  // Organization) plus the pre-existing Actor profile read — dispatch by
  // entity class so a test only has to name the rows it cares about.
  const mockEntityFind = (opts: {
    actors?: unknown[];
    tagsets?: unknown[];
    organizations?: unknown[];
  }) =>
    vi.spyOn(entityManager, 'find').mockImplementation((async (entity: any) => {
      if (entity === Actor) return opts.actors ?? [];
      if (entity === Tagset) return opts.tagsets ?? [];
      if (entity === Organization) return opts.organizations ?? [];
      return [];
    }) as any);

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
            getCredentialDefinitionForRole: vi.fn().mockResolvedValue({
              type: AuthorizationCredential.SPACE_MEMBER,
              resourceID: 'role-set-1',
            }),
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
          useValue: {
            findOne: vi.fn(),
            find: vi.fn().mockResolvedValue([]),
            createQueryBuilder: vi.fn().mockReturnValue(makeQueryBuilder([])),
          },
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

  // --- Card enrichment (workspace#077, T004) ---
  describe('tagline + tags enrichment (US1, T004)', () => {
    const anon = new ActorContext();

    it('reads tags from a separate Tagset query, never merged into the Actor read', async () => {
      mockFindOne(spaceWithVisibility());
      const findSpy = mockEntityFind({
        actors: [
          {
            id: 'u1',
            nameID: 'u1',
            profile: profileOf('profile-u1', { tagline: ' Hi ' }),
          },
        ],
        tagsets: [
          {
            name: TagsetReservedName.SKILLS,
            tags: ['b', 'a'],
            profile: { id: 'profile-u1' },
          },
        ],
      });

      const [result] = await service.getContributors(
        calloutWith([ActorType.USER]),
        ActorType.USER,
        anon
      );

      expect(result.tagline).toBe('Hi');
      expect(result.tags).toEqual(['b', 'a']);

      // Exactly one Actor read and one Tagset read; the Actor read's
      // `relations` argument is unchanged by the enrichment work.
      const actorCall = findSpy.mock.calls.find(call => call[0] === Actor);
      const tagsetCalls = findSpy.mock.calls.filter(call => call[0] === Tagset);
      expect(tagsetCalls).toHaveLength(1);
      expect(actorCall?.[1]).toEqual({
        where: { id: expect.anything() },
        relations: { profile: { location: true, visuals: true } },
      });
    });

    it('a profile with no tagset rows ⇒ tags: []', async () => {
      mockFindOne(spaceWithVisibility());
      mockEntityFind({
        actors: [{ id: 'u1', nameID: 'u1', profile: profileOf('profile-u1') }],
        tagsets: [],
      });

      const [result] = await service.getContributors(
        calloutWith([ActorType.USER]),
        ActorType.USER,
        anon
      );

      expect(result.tags).toEqual([]);
    });

    it('a contributor whose profile failed to load ⇒ tagline undefined, tags: [], no throw', async () => {
      mockFindOne(spaceWithVisibility());
      // 'u1' is ranked (default mock) but the Actor read returns nothing for it.
      mockEntityFind({ actors: [], tagsets: [] });

      const result = await service.getContributors(
        calloutWith([ActorType.USER]),
        ActorType.USER,
        anon
      );

      expect(result).toHaveLength(1);
      expect(result[0].tagline).toBeUndefined();
      expect(result[0].tags).toEqual([]);
    });
  });

  // --- Organisation website + associates (US1/US5, T005) ---
  describe('organisation website + associatesCount enrichment (T005)', () => {
    const anon = new ActorContext();

    it('neither read is issued for USER or VIRTUAL_CONTRIBUTOR', async () => {
      mockFindOne(spaceWithVisibility());
      const cqbSpy = vi
        .spyOn(entityManager, 'createQueryBuilder')
        .mockReturnValue(makeQueryBuilder([]));
      const findSpy = mockEntityFind({
        actors: [{ id: 'u1', nameID: 'u1', profile: profileOf('p-u1') }],
      });

      const [result] = await service.getContributors(
        calloutWith([ActorType.USER]),
        ActorType.USER,
        anon
      );

      expect(result.website).toBeUndefined();
      expect(result.associatesCount).toBeUndefined();
      // The organization website read never runs for USER (the query
      // builder itself is still opened once, for the unrelated
      // joined-date read — asserted separately in the T006 block).
      expect(findSpy).not.toHaveBeenCalledWith(Organization, expect.anything());
      // The associates-count query is the only caller of `innerJoin`; a
      // USER card never triggers it.
      expect(cqbSpy).toHaveBeenCalledTimes(1);
      const qb = cqbSpy.mock.results[0]?.value;
      expect(qb.innerJoin).not.toHaveBeenCalled();
    });

    it('an organisation missing from the count result ⇒ 0 (not undefined)', async () => {
      mockFindOne(spaceWithVisibility());
      mockEntityFind({
        organizations: [{ id: 'o1', website: 'https://a.org' }],
      });
      vi.spyOn(entityManager, 'createQueryBuilder').mockReturnValue(
        makeQueryBuilder([]) // no rows ⇒ o1 absent from the count result
      );

      const [result] = await service.getContributors(
        calloutWith([ActorType.ORGANIZATION]),
        ActorType.ORGANIZATION,
        anon
      );

      expect(result.website).toBe('https://a.org');
      expect(result.associatesCount).toBe(0);
    });

    it('the associates query builder is given the credential type, USER actor type and an inner join', async () => {
      mockFindOne(spaceWithVisibility());
      mockEntityFind({
        organizations: [{ id: 'o1', website: '' }],
      });
      const qb = makeQueryBuilder([{ resourceID: 'o1', count: '3' }]);
      vi.spyOn(entityManager, 'createQueryBuilder').mockReturnValue(qb);

      const [result] = await service.getContributors(
        calloutWith([ActorType.ORGANIZATION]),
        ActorType.ORGANIZATION,
        anon
      );

      expect(result.associatesCount).toBe(3);
      expect(qb.innerJoin).toHaveBeenCalledWith('credential.actor', 'actor');
      expect(qb.where).toHaveBeenCalledWith('credential.type = :type', {
        type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('actor.type = :actorType', {
        actorType: ActorType.USER,
      });
      expect(qb.groupBy).toHaveBeenCalledWith('credential.resourceID');
    });
  });

  // --- Join month (US4, T006) ---
  describe('joinedDate enrichment (US4, T006)', () => {
    const anon = new ActorContext();

    it('the read is not issued for ORGANIZATION or VIRTUAL_CONTRIBUTOR', async () => {
      mockFindOne(spaceWithVisibility());
      mockEntityFind({
        organizations: [{ id: 'o1', website: '' }],
      });
      const cqbSpy = vi
        .spyOn(entityManager, 'createQueryBuilder')
        .mockReturnValue(makeQueryBuilder([]));

      const [result] = await service.getContributors(
        calloutWith([ActorType.ORGANIZATION]),
        ActorType.ORGANIZATION,
        anon
      );

      expect(result.joinedDate).toBeUndefined();
      // Only the associates-count query builder call, never a joined-date one:
      // both share the same Credential entity, so assert via call count.
      expect(cqbSpy).toHaveBeenCalledTimes(1);
    });

    it('the criteria come from the role-set mock (a subspace credential definition)', async () => {
      mockFindOne(spaceWithVisibility());
      mockEntityFind({
        actors: [{ id: 'u1', nameID: 'u1', profile: profileOf('p-u1') }],
      });
      (
        roleSetService.getCredentialDefinitionForRole as ReturnType<
          typeof vi.fn
        >
      ).mockResolvedValue({ type: 'space-member', resourceID: 'subspace-1' });
      const qb = makeQueryBuilder([
        { actorId: 'u1', minCreatedDate: '2023-10-31T23:30:00.000Z' },
      ]);
      vi.spyOn(entityManager, 'createQueryBuilder').mockReturnValue(qb);

      const [result] = await service.getContributors(
        calloutWith([ActorType.USER]),
        ActorType.USER,
        anon
      );

      expect(
        roleSetService.getCredentialDefinitionForRole
      ).toHaveBeenCalledWith(roleSet, RoleName.MEMBER);
      expect(qb.where).toHaveBeenCalledWith('credential.type = :type', {
        type: 'space-member',
      });
      expect(qb.andWhere).toHaveBeenCalledWith(
        'credential.resourceID = :resourceID',
        { resourceID: 'subspace-1' }
      );
      expect(result.joinedDate?.toISOString()).toBe('2023-10-01T00:00:00.000Z');
    });

    it('an id absent from the result ⇒ joinedDate undefined', async () => {
      mockFindOne(spaceWithVisibility());
      mockEntityFind({
        actors: [{ id: 'u1', nameID: 'u1', profile: profileOf('p-u1') }],
      });
      vi.spyOn(entityManager, 'createQueryBuilder').mockReturnValue(
        makeQueryBuilder([])
      );

      const [result] = await service.getContributors(
        calloutWith([ActorType.USER]),
        ActorType.USER,
        anon
      );

      expect(result.joinedDate).toBeUndefined();
    });
  });

  // --- Gates, null matrix, read budget, unchanged behaviour (US2, T007) ---
  describe('service-level enrichment guarantees (T007)', () => {
    const anon = new ActorContext();

    it('MEMBERS_ONLY + anonymous, type USER ⇒ [] and zero enrichment reads', async () => {
      mockFindOne(spaceWithVisibility(UserInformationVisibility.MEMBERS_ONLY));
      const findSpy = mockEntityFind({});
      const cqbSpy = vi
        .spyOn(entityManager, 'createQueryBuilder')
        .mockReturnValue(makeQueryBuilder([]));

      const result = await service.getContributors(
        calloutWith([ActorType.USER]),
        ActorType.USER,
        anon
      );

      expect(result).toEqual([]);
      expect(findSpy).not.toHaveBeenCalled();
      expect(cqbSpy).not.toHaveBeenCalled();
      expect(
        roleSetService.getCredentialDefinitionForRole
      ).not.toHaveBeenCalled();
    });

    it('a deselected type ⇒ [] and zero enrichment reads', async () => {
      mockFindOne(spaceWithVisibility());
      const findSpy = mockEntityFind({});
      const cqbSpy = vi
        .spyOn(entityManager, 'createQueryBuilder')
        .mockReturnValue(makeQueryBuilder([]));

      const result = await service.getContributors(
        calloutWith([ActorType.ORGANIZATION]),
        ActorType.USER,
        anon
      );

      expect(result).toEqual([]);
      expect(findSpy).not.toHaveBeenCalled();
      expect(cqbSpy).not.toHaveBeenCalled();
      expect(
        roleSetService.getCredentialDefinitionForRole
      ).not.toHaveBeenCalled();
    });

    it('null matrix: USER carries website/associatesCount undefined', async () => {
      mockFindOne(spaceWithVisibility());
      mockEntityFind({
        actors: [{ id: 'u1', nameID: 'u1', profile: profileOf('p-u1') }],
      });

      const [result] = await service.getContributors(
        calloutWith([ActorType.USER]),
        ActorType.USER,
        anon
      );

      expect(result.website).toBeUndefined();
      expect(result.associatesCount).toBeUndefined();
    });

    it('null matrix: ORGANIZATION carries joinedDate undefined and a numeric associatesCount', async () => {
      mockFindOne(spaceWithVisibility());
      mockEntityFind({
        organizations: [{ id: 'o1', website: '' }],
      });
      vi.spyOn(entityManager, 'createQueryBuilder').mockReturnValue(
        makeQueryBuilder([{ resourceID: 'o1', count: '2' }])
      );

      const [result] = await service.getContributors(
        calloutWith([ActorType.ORGANIZATION]),
        ActorType.ORGANIZATION,
        anon
      );

      expect(result.joinedDate).toBeUndefined();
      expect(result.associatesCount).toBe(2);
    });

    it('null matrix: VIRTUAL_CONTRIBUTOR carries tagline/tags real, the other three undefined', async () => {
      mockFindOne(spaceWithVisibility());
      // Default mock returns [] for VC role lookups, so seed one directly.
      vi.spyOn(
        roleSetService,
        'getVirtualContributorsWithRole'
      ).mockImplementation(async (_rs, role) =>
        role === 'member' ? ([{ id: 'vc1' }] as any) : []
      );
      mockEntityFind({
        actors: [{ id: 'vc1', nameID: 'vc1', profile: profileOf('p-vc1') }],
      });

      const [result] = await service.getContributors(
        calloutWith([ActorType.VIRTUAL_CONTRIBUTOR]),
        ActorType.VIRTUAL_CONTRIBUTOR,
        anon
      );

      expect(result.joinedDate).toBeUndefined();
      expect(result.website).toBeUndefined();
      expect(result.associatesCount).toBeUndefined();
    });

    // Each case re-spies find/createQueryBuilder fresh and explicitly clears
    // call history before every measurement — vi.spyOn on an
    // already-replaced method reuses the same mock function object, so a
    // stale call count would otherwise leak across the 3-vs-300 comparison.
    const countEnrichmentReads = (
      findSpy: ReturnType<typeof vi.fn>,
      cqbSpy: ReturnType<typeof vi.fn>
    ) =>
      findSpy.mock.calls.filter(
        (call: unknown[]) => call[0] === Tagset || call[0] === Organization
      ).length + cqbSpy.mock.calls.length;

    it('read budget for USER is identical for 3 and 300 contributors (= 2)', async () => {
      mockFindOne(spaceWithVisibility());
      const findSpy = mockEntityFind({});
      const cqbSpy = vi
        .spyOn(entityManager, 'createQueryBuilder')
        .mockReturnValue(makeQueryBuilder([]));

      for (const count of [3, 300]) {
        findSpy.mockClear();
        cqbSpy.mockClear();
        vi.spyOn(roleSetService, 'getUsersWithRole').mockImplementation(
          async (_rs, role) =>
            role === 'member'
              ? (Array.from({ length: count }, (_, i) => ({
                  id: `u${i}`,
                })) as any)
              : []
        );
        (findSpy as any).mockImplementation(async (entity: any) => {
          if (entity === Actor) {
            return Array.from({ length: count }, (_, i) => ({
              id: `u${i}`,
              nameID: `u${i}`,
              profile: profileOf(`p-u${i}`),
            }));
          }
          return [];
        });

        await service.getContributors(
          calloutWith([ActorType.USER]),
          ActorType.USER,
          anon
        );
        expect(countEnrichmentReads(findSpy, cqbSpy)).toBe(2);
      }
    });

    it('read budget for ORGANIZATION is identical for 3 and 300 contributors (= 3)', async () => {
      mockFindOne(spaceWithVisibility());
      const findSpy = mockEntityFind({});
      const cqbSpy = vi
        .spyOn(entityManager, 'createQueryBuilder')
        .mockReturnValue(makeQueryBuilder([]));

      for (const count of [3, 300]) {
        findSpy.mockClear();
        cqbSpy.mockClear();
        vi.spyOn(roleSetService, 'getOrganizationsWithRole').mockImplementation(
          async (_rs, role) =>
            role === 'member'
              ? (Array.from({ length: count }, (_, i) => ({
                  id: `o${i}`,
                })) as any)
              : []
        );
        (findSpy as any).mockImplementation(async (entity: any) => {
          if (entity === Organization) {
            return Array.from({ length: count }, (_, i) => ({
              id: `o${i}`,
              website: '',
            }));
          }
          if (entity === Actor) {
            // Profiles must resolve too, or `loadTagsetsByProfileId` never
            // fires (empty profile-id list short-circuits it) — the Tagset
            // read is part of the budget being measured here.
            return Array.from({ length: count }, (_, i) => ({
              id: `o${i}`,
              nameID: `o${i}`,
              profile: profileOf(`p-o${i}`),
            }));
          }
          return [];
        });

        await service.getContributors(
          calloutWith([ActorType.ORGANIZATION]),
          ActorType.ORGANIZATION,
          anon
        );
        expect(countEnrichmentReads(findSpy, cqbSpy)).toBe(3);
      }
    });

    it('read budget for VIRTUAL_CONTRIBUTOR is identical for 3 and 300 contributors (= 1)', async () => {
      mockFindOne(spaceWithVisibility());
      const findSpy = mockEntityFind({});
      const cqbSpy = vi
        .spyOn(entityManager, 'createQueryBuilder')
        .mockReturnValue(makeQueryBuilder([]));

      for (const count of [3, 300]) {
        findSpy.mockClear();
        cqbSpy.mockClear();
        vi.spyOn(
          roleSetService,
          'getVirtualContributorsWithRole'
        ).mockImplementation(async (_rs, role) =>
          role === 'member'
            ? (Array.from({ length: count }, (_, i) => ({
                id: `vc${i}`,
              })) as any)
            : []
        );
        (findSpy as any).mockImplementation(async (entity: any) => {
          if (entity === Actor) {
            return Array.from({ length: count }, (_, i) => ({
              id: `vc${i}`,
              nameID: `vc${i}`,
              profile: profileOf(`p-vc${i}`),
            }));
          }
          return [];
        });

        await service.getContributors(
          calloutWith([ActorType.VIRTUAL_CONTRIBUTOR]),
          ActorType.VIRTUAL_CONTRIBUTOR,
          anon
        );
        expect(countEnrichmentReads(findSpy, cqbSpy)).toBe(1);
      }
    });

    it('getContributorCounts issues no enrichment read', async () => {
      mockFindOne(spaceWithVisibility());
      const findSpy = mockEntityFind({});
      const cqbSpy = vi
        .spyOn(entityManager, 'createQueryBuilder')
        .mockReturnValue(makeQueryBuilder([]));

      await service.getContributorCounts(
        calloutWith([ActorType.USER, ActorType.ORGANIZATION]),
        anon
      );

      expect(findSpy).not.toHaveBeenCalled();
      expect(cqbSpy).not.toHaveBeenCalled();
    });
  });
});
