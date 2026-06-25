import { ContributorType } from '@common/enums/contributor.type';
import { UserInformationVisibility } from '@common/enums/user.information.visibility';
import { ActorContext } from '@core/actor-context/actor.context';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { CommunityService } from '@domain/community/community/community.service';
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
  let communityService: CommunityService;
  let communityResolver: CommunityResolverService;
  let entityManager: EntityManager;

  const roleSet = { id: 'role-set-1' } as any;
  const community = { id: 'community-1' } as any;

  const calloutWith = (contributorTypes: ContributorType[]): ICallout =>
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
        },
      },
    }) as unknown as ICallout;

  const spaceWithVisibility = (
    visibility?: UserInformationVisibility
  ): any => ({
    id: 'space-1',
    settings: { privacy: { userInformationVisibility: visibility } },
  });

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
          provide: CommunityService,
          useValue: { getRoleSet: vi.fn() },
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
        { provide: EntityManager, useValue: { findOne: vi.fn() } },
      ],
    }).compile();

    service = module.get(ContributorCollectionService);
    roleSetService = module.get(RoleSetService);
    communityService = module.get(CommunityService);
    communityResolver = module.get(CommunityResolverService);
    entityManager = module.get(EntityManager);

    vi.spyOn(
      communityResolver,
      'getCommunityFromCollaborationCalloutOrFail'
    ).mockResolvedValue(community);
    vi.spyOn(communityService, 'getRoleSet').mockResolvedValue(roleSet);
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
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(
        spaceWithVisibility()
      );
      const anon = new ActorContext(); // actorID === '' (anonymous)

      const counts = await service.getContributorCounts(
        calloutWith([ContributorType.ORGANIZATION]),
        anon
      );

      expect(counts.users).toBe(0);
      expect(counts.organizations).toBe(1);
      expect(counts.virtualContributors).toBe(0);
    });

    it('returns an empty set when querying a deselected type', async () => {
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(
        spaceWithVisibility()
      );
      const anon = new ActorContext();

      const users = await service.getContributors(
        calloutWith([ContributorType.ORGANIZATION]),
        ContributorType.USER,
        anon
      );

      expect(users).toEqual([]);
    });
  });

  describe('members-only user-information visibility (FR-015/FR-017)', () => {
    it('hides member USERS from a non-member when members-only', async () => {
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(
        spaceWithVisibility(UserInformationVisibility.MEMBERS_ONLY)
      );
      vi.spyOn(roleSetService, 'isMember').mockResolvedValue(false);
      const viewer = new ActorContext();
      viewer.actorID = 'non-member';

      const counts = await service.getContributorCounts(
        calloutWith([ContributorType.USER, ContributorType.ORGANIZATION]),
        viewer
      );

      // Users hidden, organizations unaffected.
      expect(counts.users).toBe(0);
      expect(counts.organizations).toBe(1);

      const users = await service.getContributors(
        calloutWith([ContributorType.USER]),
        ContributorType.USER,
        viewer
      );
      expect(users).toEqual([]);
    });

    it('hides member USERS from anonymous viewers when members-only', async () => {
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(
        spaceWithVisibility(UserInformationVisibility.MEMBERS_ONLY)
      );
      const isMemberSpy = vi.spyOn(roleSetService, 'isMember');
      const anon = new ActorContext();

      const counts = await service.getContributorCounts(
        calloutWith([ContributorType.USER]),
        anon
      );

      expect(counts.users).toBe(0);
      // Anonymous is short-circuited as non-member without a membership query.
      expect(isMemberSpy).not.toHaveBeenCalled();
    });

    it('shows member USERS to a member when members-only', async () => {
      vi.spyOn(entityManager, 'findOne').mockResolvedValue(
        spaceWithVisibility(UserInformationVisibility.MEMBERS_ONLY)
      );
      vi.spyOn(roleSetService, 'isMember').mockResolvedValue(true);
      const member = new ActorContext();
      member.actorID = 'a-member';

      const counts = await service.getContributorCounts(
        calloutWith([ContributorType.USER]),
        member
      );

      expect(counts.users).toBe(1);
    });
  });
});
