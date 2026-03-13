import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleName } from '@common/enums/role.name';
import { RoleSetMembershipStatusDataLoader } from '@domain/access/role-set/role.set.data.loader.membership.status';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { SpaceAboutMembership } from './dto/space.about.membership';
import { SpaceAboutMembershipResolverFields } from './space.about.membership.resolver.fields';

describe('SpaceAboutMembershipResolverFields', () => {
  let resolver: SpaceAboutMembershipResolverFields;
  let roleSetService: RoleSetService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let membershipStatusLoader: RoleSetMembershipStatusDataLoader;

  beforeEach(async () => {
    vi.restoreAllMocks();

    membershipStatusLoader = {
      loader: { load: vi.fn() },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SpaceAboutMembershipResolverFields,
        MockWinstonProvider,
        {
          provide: RoleSetMembershipStatusDataLoader,
          useValue: membershipStatusLoader,
        },
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get(SpaceAboutMembershipResolverFields);
    roleSetService = module.get(RoleSetService);
    authorizationPolicyService = module.get(AuthorizationPolicyService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('myPrivileges', () => {
    it('should return privileges for the current actor', () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const membership = {
        roleSet: {
          authorization: { id: 'auth-1' },
        },
      } as SpaceAboutMembership;
      const validatedAuth = { id: 'validated-auth' } as any;
      const privileges = [AuthorizationPrivilege.READ];

      vi.mocked(
        authorizationPolicyService.validateAuthorization
      ).mockReturnValue(validatedAuth);
      vi.mocked(authorizationPolicyService.getAgentPrivileges).mockReturnValue(
        privileges
      );

      const result = resolver.myPrivileges(actorContext, membership);

      expect(result).toBe(privileges);
      expect(
        authorizationPolicyService.validateAuthorization
      ).toHaveBeenCalledWith(membership.roleSet.authorization);
      expect(
        authorizationPolicyService.getAgentPrivileges
      ).toHaveBeenCalledWith(actorContext, validatedAuth);
    });
  });

  describe('roleSetID', () => {
    it('should return the roleSet ID', () => {
      const membership = {
        roleSet: { id: 'rs-1' },
      } as SpaceAboutMembership;

      const result = resolver.roleSetID(membership);
      expect(result).toBe('rs-1');
    });
  });

  describe('communityID', () => {
    it('should return the community ID', () => {
      const membership = {
        community: { id: 'comm-1' },
      } as SpaceAboutMembership;

      const result = resolver.communityID(membership);
      expect(result).toBe('comm-1');
    });
  });

  describe('applicationForm', () => {
    it('should delegate to roleSetService', async () => {
      const membership = {
        roleSet: { id: 'rs-1' },
      } as SpaceAboutMembership;
      const form = { id: 'form-1' } as any;

      vi.mocked(roleSetService.getApplicationForm).mockResolvedValue(form);

      const result = await resolver.applicationForm(membership);
      expect(result).toBe(form);
      expect(roleSetService.getApplicationForm).toHaveBeenCalledWith(
        membership.roleSet
      );
    });
  });

  describe('myMembershipStatus', () => {
    it('should use data loader to get membership status', async () => {
      const actorContext = { actorID: 'actor-1' } as any;
      const membership = {
        roleSet: { id: 'rs-1' },
      } as SpaceAboutMembership;

      vi.mocked(membershipStatusLoader.loader.load as any).mockResolvedValue(
        CommunityMembershipStatus.MEMBER
      );

      const result = await resolver.myMembershipStatus(
        actorContext,
        membership
      );
      expect(result).toBe(CommunityMembershipStatus.MEMBER);
      expect(membershipStatusLoader.loader.load).toHaveBeenCalledWith({
        actorContext,
        roleSet: membership.roleSet,
      });
    });
  });

  describe('leadUsers', () => {
    it('should return empty array when LEAD role credential not found', async () => {
      const membership = {
        roleSet: {
          roles: [{ name: RoleName.MEMBER, credential: { type: 'x' } }],
        },
      } as any;
      const loader = { load: vi.fn() } as any;

      const result = await resolver.leadUsers(membership, loader);
      expect(result).toEqual([]);
      expect(loader.load).not.toHaveBeenCalled();
    });

    it('should load lead users when LEAD role credential exists', async () => {
      const credential = { type: 'lead-type', resourceID: 'res-1' };
      const membership = {
        roleSet: {
          roles: [{ name: RoleName.LEAD, credential }],
        },
      } as any;
      const users = [{ id: 'user-1' }] as any;
      const loader = { load: vi.fn().mockResolvedValue(users) } as any;

      const result = await resolver.leadUsers(membership, loader);
      expect(result).toBe(users);
      expect(loader.load).toHaveBeenCalledWith('lead-type|res-1');
    });
  });

  describe('leadOrganizations', () => {
    it('should return empty array when LEAD role credential not found', async () => {
      const membership = {
        roleSet: { roles: [] },
      } as any;
      const loader = { load: vi.fn() } as any;

      const result = await resolver.leadOrganizations(membership, loader);
      expect(result).toEqual([]);
    });

    it('should load lead organizations when LEAD role credential exists', async () => {
      const credential = { type: 'lead-type', resourceID: 'res-1' };
      const membership = {
        roleSet: {
          roles: [{ name: RoleName.LEAD, credential }],
        },
      } as any;
      const orgs = [{ id: 'org-1' }] as any;
      const loader = { load: vi.fn().mockResolvedValue(orgs) } as any;

      const result = await resolver.leadOrganizations(membership, loader);
      expect(result).toBe(orgs);
      expect(loader.load).toHaveBeenCalledWith('lead-type|res-1');
    });
  });
});
