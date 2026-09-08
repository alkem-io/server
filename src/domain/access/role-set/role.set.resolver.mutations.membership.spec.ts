import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleSetInvitationResultType } from '@common/enums/role.set.invitation.result.type';
import { RoleSetType } from '@common/enums/role.set.type';
import { ValidationException } from '@common/exceptions';
import { ForbiddenAuthorizationPolicyException } from '@common/exceptions/forbidden.authorization.policy.exception';
import { RoleSetInvitationException } from '@common/exceptions/role.set.invitation.exception';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ApplicationService } from '@domain/access/application/application.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationOrganizationAdapter } from '@services/adapters/notification-adapter/notification.organization.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationUserAdapter } from '@services/adapters/notification-adapter/notification.user.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { RoleSetEligibleLanguageGuard } from './role.set.eligible.language.guard';
import { RoleSetResolverMutationsMembership } from './role.set.resolver.mutations.membership';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';
import { RoleSetCacheService } from './role.set.service.cache';

describe('RoleSetResolverMutationsMembership', () => {
  let resolver: RoleSetResolverMutationsMembership;
  let roleSetService: RoleSetService;
  let authorizationService: AuthorizationService;
  let applicationService: ApplicationService;
  let invitationService: InvitationService;
  let roleSetCacheService: RoleSetCacheService;
  let lifecycleService: LifecycleService;
  let roleSetAuthorizationService: RoleSetAuthorizationService;
  let actorLookupService: ActorLookupService;
  let userLookupService: UserLookupService;
  let organizationLookupService: OrganizationLookupService;
  let communityResolverService: CommunityResolverService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let eligibleLanguageGuard: RoleSetEligibleLanguageGuard;
  let notificationOrganizationAdapter: NotificationOrganizationAdapter;
  let notificationAdapterSpace: NotificationSpaceAdapter;
  let notificationUserAdapter: NotificationUserAdapter;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSetResolverMutationsMembership,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    resolver = module.get<RoleSetResolverMutationsMembership>(
      RoleSetResolverMutationsMembership
    );
    roleSetService = module.get<RoleSetService>(RoleSetService);
    // validateInviteesAndRolesOrFail loads the requested definitions in one
    // call; derive them from the per-role mock so existing cases keep driving
    // policy through getRoleDefinition.
    (roleSetService.getRoleDefinitions as Mock).mockImplementation(
      async (roleSet: any, roles: any[] = []) =>
        Promise.all(
          roles.map(async name => ({
            ...(await roleSetService.getRoleDefinition(roleSet, name)),
            name,
          }))
        )
    );
    authorizationService =
      module.get<AuthorizationService>(AuthorizationService);
    applicationService = module.get<ApplicationService>(ApplicationService);
    invitationService = module.get<InvitationService>(InvitationService);
    roleSetCacheService = module.get<RoleSetCacheService>(RoleSetCacheService);
    lifecycleService = module.get<LifecycleService>(LifecycleService);
    roleSetAuthorizationService = module.get<RoleSetAuthorizationService>(
      RoleSetAuthorizationService
    );
    actorLookupService = module.get<ActorLookupService>(ActorLookupService);
    userLookupService = module.get<UserLookupService>(UserLookupService);
    organizationLookupService = module.get<OrganizationLookupService>(
      OrganizationLookupService
    );
    notificationOrganizationAdapter =
      module.get<NotificationOrganizationAdapter>(
        NotificationOrganizationAdapter
      );
    notificationUserAdapter = module.get<NotificationUserAdapter>(
      NotificationUserAdapter
    );
    notificationAdapterSpace = module.get<NotificationSpaceAdapter>(
      NotificationSpaceAdapter
    );
    communityResolverService = module.get<CommunityResolverService>(
      CommunityResolverService
    );
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    eligibleLanguageGuard = module.get<RoleSetEligibleLanguageGuard>(
      RoleSetEligibleLanguageGuard
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('joinRoleSet', () => {
    it('should join roleSet via the shared grant service (source: join) when type is SPACE', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (
        roleSetService.getMembershipStatusByActorContext as Mock
      ).mockResolvedValue(CommunityMembershipStatus.NOT_MEMBER);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (
        roleSetService.ensureMemberOfRoleSetAndAncestors as Mock
      ).mockResolvedValue(undefined);

      const result = await resolver.joinRoleSet(actorContext, {
        roleSetID: 'rs-1',
      } as any);

      expect(result).toBe(mockRoleSet);
      // Feature 017 round 2 — join routes through the shared grant so an
      // eligible non-parent-member is registered in the Subspace + ancestors.
      expect(
        roleSetService.ensureMemberOfRoleSetAndAncestors
      ).toHaveBeenCalledWith(mockRoleSet, 'user-1', actorContext, {
        source: 'join',
      });
      // The JOIN privilege is still enforced as the first gate.
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalled();
    });

    it('should throw when invitation is pending', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (
        roleSetService.getMembershipStatusByActorContext as Mock
      ).mockResolvedValue(CommunityMembershipStatus.INVITATION_PENDING);

      await expect(
        resolver.joinRoleSet(actorContext, { roleSetID: 'rs-1' } as any)
      ).rejects.toThrow(RoleSetMembershipException);
    });

    it('should throw when roleSet type is neither SPACE nor ORGANIZATION', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.PLATFORM,
        authorization: { id: 'auth-1' },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);

      await expect(
        resolver.joinRoleSet(actorContext, { roleSetID: 'rs-1' } as any)
      ).rejects.toThrow(ValidationException);
    });

    describe('ORGANIZATION (domain-join door, US4/FR-016)', () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'org-rs-1',
        type: RoleSetType.ORGANIZATION,
        authorization: { id: 'auth-1' },
      } as any;

      const arrange = (organizationOverrides: Record<string, unknown> = {}) => {
        (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(
          mockRoleSet
        );
        (
          roleSetService.getMembershipStatusByActorContext as Mock
        ).mockResolvedValue(CommunityMembershipStatus.NOT_MEMBER);
        (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
          undefined
        );
        (userLookupService.getUserByIdOrFail as Mock).mockResolvedValue({
          id: 'user-1',
          email: 'w@example.com',
        });
        (
          organizationLookupService.getOrganizationForRoleSetOrFail as Mock
        ).mockResolvedValue({
          id: 'org-1',
          domain: 'example.com',
          settings: {
            membership: { allowUsersMatchingDomainToJoin: true },
          },
          verification: { status: 'verified-manual-attestation' },
          ...organizationOverrides,
        });
        (
          roleSetService.ensureMemberOfRoleSetAndAncestors as Mock
        ).mockResolvedValue(undefined);
      };

      it('grants READ (not ROLESET_ENTRY_ROLE_JOIN) and joins via the shared grant service when eligible', async () => {
        arrange();

        const result = await resolver.joinRoleSet(actorContext, {
          roleSetID: 'org-rs-1',
        } as any);

        expect(result).toBe(mockRoleSet);
        expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
          actorContext,
          mockRoleSet.authorization,
          AuthorizationPrivilege.READ,
          expect.any(String)
        );
        expect(
          roleSetService.ensureMemberOfRoleSetAndAncestors
        ).toHaveBeenCalledWith(mockRoleSet, 'user-1', actorContext, {
          source: 'join',
        });
      });

      it('throws ROLESET_JOIN_NOT_ELIGIBLE and never grants when the domain does not match', async () => {
        arrange({ domain: 'other.org' });

        await expect(
          resolver.joinRoleSet(actorContext, {
            roleSetID: 'org-rs-1',
          } as any)
        ).rejects.toThrow(RoleSetMembershipException);
        expect(
          roleSetService.ensureMemberOfRoleSetAndAncestors
        ).not.toHaveBeenCalled();
      });

      it('throws ROLESET_JOIN_NOT_ELIGIBLE when the switch is off', async () => {
        arrange({
          settings: { membership: { allowUsersMatchingDomainToJoin: false } },
        });

        await expect(
          resolver.joinRoleSet(actorContext, {
            roleSetID: 'org-rs-1',
          } as any)
        ).rejects.toThrow(RoleSetMembershipException);
        expect(
          roleSetService.ensureMemberOfRoleSetAndAncestors
        ).not.toHaveBeenCalled();
      });

      it('throws ROLESET_JOIN_NOT_ELIGIBLE when the organization is not verified by manual attestation', async () => {
        arrange({ verification: { status: 'not-verified' } });

        await expect(
          resolver.joinRoleSet(actorContext, {
            roleSetID: 'org-rs-1',
          } as any)
        ).rejects.toThrow(RoleSetMembershipException);
        expect(
          roleSetService.ensureMemberOfRoleSetAndAncestors
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('applyForEntryRoleOnRoleSet', () => {
    it('should create application on SPACE roleSet', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        parentRoleSet: undefined,
      } as any;
      const mockApplication = { id: 'app-1' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.createApplication as Mock).mockResolvedValue(
        mockApplication
      );
      (applicationService.save as Mock).mockResolvedValue(mockApplication);
      (applicationService.getApplicationOrFail as Mock).mockResolvedValue(
        mockApplication
      );
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);

      const result = await resolver.applyForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-1',
        questions: [],
      } as any);

      expect(result).toBe(mockApplication);
    });

    it('should throw when user is not member of parent', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const parentRoleSet = { id: 'parent-rs' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        parentRoleSet,
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.isInRole as Mock).mockResolvedValue(false);
      // Feature 017: a non-parent-member is only allowed to apply when the
      // combined-flow preconditions hold; here they do not, so the original
      // "join the parent first" exception must still fire.
      (
        roleSetService.isCombinedApplicationGrantAuthorised as Mock
      ).mockResolvedValue(false);

      await expect(
        resolver.applyForEntryRoleOnRoleSet(actorContext, {
          roleSetID: 'rs-1',
          questions: [],
        } as any)
      ).rejects.toThrow(RoleSetMembershipException);
    });

    it('should allow a non-parent-member to apply when the combined Subspace flow is authorised', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const parentRoleSet = { id: 'parent-rs' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        parentRoleSet,
      } as any;
      const mockApplication = { id: 'app-1' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      // Not a member of the parent...
      (roleSetService.isInRole as Mock).mockResolvedValue(false);
      // ...but the combined Subspace application flow is authorised.
      (
        roleSetService.isCombinedApplicationGrantAuthorised as Mock
      ).mockResolvedValue(true);
      (roleSetService.createApplication as Mock).mockResolvedValue(
        mockApplication
      );
      (applicationService.save as Mock).mockResolvedValue(mockApplication);
      (applicationService.getApplicationOrFail as Mock).mockResolvedValue(
        mockApplication
      );
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);

      const result = await resolver.applyForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-1',
        questions: [],
      } as any);

      expect(result).toBe(mockApplication);
    });

    describe('ORGANIZATION (allowApplications switch, US3-AS5)', () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'org-rs-1',
        type: RoleSetType.ORGANIZATION,
        authorization: { id: 'auth-1' },
      } as any;
      const mockApplication = {
        id: 'app-1',
        questions: [{ value: 'a note' }],
      } as any;

      it('creates an application and dispatches the organization admin notification when applications are accepted', async () => {
        (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(
          mockRoleSet
        );
        (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
          undefined
        );
        (
          organizationLookupService.getOrganizationForRoleSetOrFail as Mock
        ).mockResolvedValue({
          id: 'org-1',
          settings: { membership: { allowApplications: true } },
        });
        (roleSetService.createApplication as Mock).mockResolvedValue(
          mockApplication
        );
        (applicationService.save as Mock).mockResolvedValue(mockApplication);
        (applicationService.getApplicationOrFail as Mock).mockResolvedValue(
          mockApplication
        );
        (userLookupService.usersWithCredentials as Mock).mockResolvedValue([
          { id: 'admin-1' },
        ]);
        (
          roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
        ).mockResolvedValue([]);

        const result = await resolver.applyForEntryRoleOnRoleSet(actorContext, {
          roleSetID: 'org-rs-1',
          questions: [],
        } as any);

        expect(result).toBe(mockApplication);
        expect(
          communityResolverService.getCommunityForRoleSet
        ).not.toHaveBeenCalled();
        expect(
          notificationOrganizationAdapter.organizationAdminAssociateApplicationCreated
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationID: 'org-1',
            applicationID: 'app-1',
            applicantID: 'user-1',
            applicationMessage: 'a note',
            organizationHasNoAdministrators: false,
          })
        );
      });

      it('rejects with a typed error before creating anything when the switch is off', async () => {
        (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(
          mockRoleSet
        );
        (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
          undefined
        );
        (
          organizationLookupService.getOrganizationForRoleSetOrFail as Mock
        ).mockResolvedValue({
          id: 'org-1',
          settings: { membership: { allowApplications: false } },
        });

        await expect(
          resolver.applyForEntryRoleOnRoleSet(actorContext, {
            roleSetID: 'org-rs-1',
            questions: [],
          } as any)
        ).rejects.toThrow(RoleSetMembershipException);
        expect(roleSetService.createApplication).not.toHaveBeenCalled();
      });

      it('escalates to support when the organization has zero admins', async () => {
        (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(
          mockRoleSet
        );
        (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
          undefined
        );
        (
          organizationLookupService.getOrganizationForRoleSetOrFail as Mock
        ).mockResolvedValue({
          id: 'org-1',
          settings: { membership: { allowApplications: true } },
        });
        (roleSetService.createApplication as Mock).mockResolvedValue(
          mockApplication
        );
        (applicationService.save as Mock).mockResolvedValue(mockApplication);
        (applicationService.getApplicationOrFail as Mock).mockResolvedValue(
          mockApplication
        );
        (userLookupService.usersWithCredentials as Mock).mockResolvedValue([]);
        (
          roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
        ).mockResolvedValue([]);

        await resolver.applyForEntryRoleOnRoleSet(actorContext, {
          roleSetID: 'org-rs-1',
          questions: [],
        } as any);

        expect(
          notificationOrganizationAdapter.organizationAdminAssociateApplicationCreated
        ).toHaveBeenCalledWith(
          expect.objectContaining({ organizationHasNoAdministrators: true })
        );
      });
    });
  });

  describe('inviteForEntryRoleOnRoleSet', () => {
    it('should throw when no contributors provided', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);

      await expect(
        resolver.inviteForEntryRoleOnRoleSet(actorContext, {
          roleSetID: 'rs-1',
          invitedActorIDs: [],
          invitedUserEmails: [],
          extraRoles: [],
        } as any)
      ).rejects.toThrow(RoleSetInvitationException);
    });

    it('should invite existing actors', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        parentRoleSet: undefined,
      } as any;
      const mockInvitation = { id: 'inv-1', invitedActorID: 'actor-1' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['actor-1', 'user']])
      );
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.isMember as Mock).mockResolvedValue(false);
      (roleSetService.createInvitationExistingActor as Mock).mockResolvedValue(
        mockInvitation
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
        mockInvitation,
      ]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });

      const result = await resolver.inviteForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-1',
        invitedActorIDs: ['actor-1'],
        invitedUserEmails: [],
        extraRoles: [],
      } as any);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(
        RoleSetInvitationResultType.INVITED_TO_ROLE_SET
      );
    });

    it('should handle existing email user as normal invitation', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        parentRoleSet: undefined,
      } as any;
      const existingUser = { id: 'existing-user' } as any;
      const mockInvitation = {
        id: 'inv-1',
        invitedActorID: 'existing-user',
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map()
      );
      (userLookupService.getUserByEmail as Mock).mockResolvedValue(
        existingUser
      );
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.isMember as Mock).mockResolvedValue(false);
      (roleSetService.createInvitationExistingActor as Mock).mockResolvedValue(
        mockInvitation
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
        mockInvitation,
      ]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });

      const result = await resolver.inviteForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-1',
        invitedActorIDs: [],
        invitedUserEmails: ['test@example.com'],
        extraRoles: [],
      } as any);

      expect(result).toHaveLength(1);
    });

    it('should skip already-invited actors', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        parentRoleSet: undefined,
      } as any;
      const existingInvitation = { id: 'existing-inv' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['actor-1', 'user']])
      );
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(
        existingInvitation
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
        existingInvitation,
      ]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });

      const result = await resolver.inviteForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-1',
        invitedActorIDs: ['actor-1'],
        invitedUserEmails: [],
        extraRoles: [],
      } as any);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(
        RoleSetInvitationResultType.ALREADY_INVITED_TO_ROLE_SET
      );
    });

    it('should return ALREADY_HAS_OPEN_APPLICATION when an open application exists', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        parentRoleSet: undefined,
      } as any;
      const existingApplication = { id: 'existing-app' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['actor-1', 'user']])
      );
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(
        existingApplication
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });

      const result = await resolver.inviteForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-1',
        invitedActorIDs: ['actor-1'],
        invitedUserEmails: [],
        extraRoles: [],
      } as any);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(
        RoleSetInvitationResultType.ALREADY_HAS_OPEN_APPLICATION
      );
      expect(result[0].application).toBe(existingApplication);
      // The blocked actor must not produce an invitation.
      expect(
        roleSetService.createInvitationExistingActor
      ).not.toHaveBeenCalled();
    });

    it('should return ALREADY_MEMBER_OF_ROLE_SET when the actor is already a member', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        parentRoleSet: undefined,
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['actor-1', 'user']])
      );
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.isMember as Mock).mockResolvedValue(true);
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });

      const result = await resolver.inviteForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-1',
        invitedActorIDs: ['actor-1'],
        invitedUserEmails: [],
        extraRoles: [],
      } as any);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(
        RoleSetInvitationResultType.ALREADY_MEMBER_OF_ROLE_SET
      );
      expect(
        roleSetService.createInvitationExistingActor
      ).not.toHaveBeenCalled();
    });

    describe('ORGANIZATION (R1/R2/FR-002)', () => {
      const actorContext = { actorID: 'admin-1' } as any;
      const mockRoleSet = {
        id: 'org-rs-1',
        type: RoleSetType.ORGANIZATION,
        authorization: { id: 'auth-1' },
        parentRoleSet: undefined,
      } as any;

      it('rejects invitedUserEmails with a validation error before anything is created', async () => {
        (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(
          mockRoleSet
        );

        await expect(
          resolver.inviteForEntryRoleOnRoleSet(actorContext, {
            roleSetID: 'org-rs-1',
            invitedActorIDs: [],
            invitedUserEmails: ['new@example.com'],
            extraRoles: [],
          } as any)
        ).rejects.toThrow(ValidationException);
        expect(authorizationService.grantAccessOrFail).not.toHaveBeenCalled();
      });

      it('returns EXTRA_ROLE_LIMIT_REACHED and creates nothing when the offered role cap is already reached', async () => {
        (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(
          mockRoleSet
        );
        (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
          undefined
        );
        (
          actorLookupService.validateActorsAndGetTypes as Mock
        ).mockResolvedValue(new Map([['user-1', 'user']]));
        (roleSetService.countActorsWithRole as Mock).mockResolvedValue(6);
        (
          invitationService.countOpenInvitationsForRoleSet as Mock
        ).mockResolvedValue(0);
        (roleSetService.getRoleDefinition as Mock).mockResolvedValue({
          userPolicy: { maximum: 6 },
          organizationPolicy: { maximum: 0 },
          virtualContributorPolicy: { maximum: 0 },
        });
        (roleSetService.findOpenInvitation as Mock).mockResolvedValue(
          undefined
        );
        (roleSetService.findOpenApplication as Mock).mockResolvedValue(
          undefined
        );
        (roleSetService.isMember as Mock).mockResolvedValue(false);
        (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([]);
        (
          roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
        ).mockResolvedValue([]);

        const result = await resolver.inviteForEntryRoleOnRoleSet(
          actorContext,
          {
            roleSetID: 'org-rs-1',
            invitedActorIDs: ['user-1'],
            invitedUserEmails: [],
            extraRoles: ['admin'],
          } as any
        );

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(
          RoleSetInvitationResultType.EXTRA_ROLE_LIMIT_REACHED
        );
        expect(
          roleSetService.createInvitationExistingActor
        ).not.toHaveBeenCalled();
      });

      it('creates the invitation and dispatches userOrganizationAssociateInvitationCreated when under cap', async () => {
        const mockInvitation = {
          id: 'inv-1',
          invitedActorID: 'user-1',
          extraRoles: ['admin'],
          welcomeMessage: 'welcome',
        } as any;

        (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(
          mockRoleSet
        );
        (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
          undefined
        );
        (
          actorLookupService.validateActorsAndGetTypes as Mock
        ).mockResolvedValue(new Map([['user-1', 'user']]));
        (roleSetService.countActorsWithRole as Mock).mockResolvedValue(1);
        (
          invitationService.countOpenInvitationsForRoleSet as Mock
        ).mockResolvedValue(0);
        (roleSetService.getRoleDefinition as Mock).mockResolvedValue({
          userPolicy: { maximum: 6 },
          organizationPolicy: { maximum: 0 },
          virtualContributorPolicy: { maximum: 0 },
        });
        (roleSetService.findOpenInvitation as Mock).mockResolvedValue(
          undefined
        );
        (roleSetService.findOpenApplication as Mock).mockResolvedValue(
          undefined
        );
        (roleSetService.isMember as Mock).mockResolvedValue(false);
        (
          roleSetService.createInvitationExistingActor as Mock
        ).mockResolvedValue(mockInvitation);
        (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
          mockInvitation,
        ]);
        (
          roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
        ).mockResolvedValue([]);
        (actorLookupService.getActorTypeByIdOrFail as Mock).mockResolvedValue(
          'user'
        );
        (
          organizationLookupService.getOrganizationForRoleSetOrFail as Mock
        ).mockResolvedValue({ id: 'org-1' });

        const result = await resolver.inviteForEntryRoleOnRoleSet(
          actorContext,
          {
            roleSetID: 'org-rs-1',
            invitedActorIDs: ['user-1'],
            invitedUserEmails: [],
            extraRoles: ['admin'],
          } as any
        );

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe(
          RoleSetInvitationResultType.INVITED_TO_ROLE_SET
        );
        expect(
          notificationUserAdapter.userOrganizationAssociateInvitationCreated
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationID: 'org-1',
            invitationID: 'inv-1',
            inviteeID: 'user-1',
          })
        );
      });
    });
  });

  describe('inviteForEntryRoleOnRoleSet - invitee/role validation', () => {
    const baseRoleSet = {
      id: 'rs-1',
      type: RoleSetType.SPACE,
      authorization: { id: 'auth-1' },
      parentRoleSet: undefined,
    } as any;

    beforeEach(() => {
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(baseRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
    });

    it('rejects an invitee actor type that is not a contributor (e.g. a Space)', async () => {
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['space-1', 'space']])
      );

      await expect(
        resolver.inviteForEntryRoleOnRoleSet(actorContext(), {
          roleSetID: 'rs-1',
          invitedActorIDs: ['space-1'],
          invitedUserEmails: [],
          extraRoles: [],
        } as any)
      ).rejects.toThrow(ValidationException);

      expect(
        roleSetService.createInvitationExistingActor
      ).not.toHaveBeenCalled();
    });

    it('rejects an organization invited with the ADMIN role (server#4602)', async () => {
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['org-1', 'organization']])
      );
      (roleSetService.getRoleDefinition as Mock).mockResolvedValue({
        organizationPolicy: { minimum: 0, maximum: 0 },
      });

      await expect(
        resolver.inviteForEntryRoleOnRoleSet(actorContext(), {
          roleSetID: 'rs-1',
          invitedActorIDs: ['org-1'],
          invitedUserEmails: [],
          extraRoles: ['admin'],
        } as any)
      ).rejects.toThrow(ValidationException);

      expect(
        roleSetService.createInvitationExistingActor
      ).not.toHaveBeenCalled();
    });

    it('allows an organization invited with the LEAD role', async () => {
      const mockInvitation = { id: 'inv-1', invitedActorID: 'org-1' } as any;
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['org-1', 'organization']])
      );
      (roleSetService.getRoleDefinition as Mock).mockResolvedValue({
        organizationPolicy: { minimum: 0, maximum: 2 },
      });
      (
        organizationLookupService.getOrganizationByIdOrFail as Mock
      ).mockResolvedValue({
        settings: { membership: { allowSpaceInvitations: true } },
      });
      (roleSetService.countActorsWithRole as Mock).mockResolvedValue(0);
      (
        invitationService.countOpenInvitationsForRoleSet as Mock
      ).mockResolvedValue(0);
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.isMember as Mock).mockResolvedValue(false);
      (roleSetService.createInvitationExistingActor as Mock).mockResolvedValue(
        mockInvitation
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
        mockInvitation,
      ]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });

      const result = await resolver.inviteForEntryRoleOnRoleSet(
        actorContext(),
        {
          roleSetID: 'rs-1',
          invitedActorIDs: ['org-1'],
          invitedUserEmails: [],
          extraRoles: ['lead'],
        } as any
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(
        RoleSetInvitationResultType.INVITED_TO_ROLE_SET
      );
    });

    it('allows a user invited with the ADMIN role (unchanged)', async () => {
      const mockInvitation = { id: 'inv-1', invitedActorID: 'user-1' } as any;
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['user-1', 'user']])
      );
      // ADMIN is forbidden to organizations (maximum 0) but allowed to users.
      (roleSetService.getRoleDefinition as Mock).mockResolvedValue({
        userPolicy: { minimum: 0, maximum: -1 },
        organizationPolicy: { minimum: 0, maximum: 0 },
        virtualContributorPolicy: { minimum: 0, maximum: 0 },
      });
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.isMember as Mock).mockResolvedValue(false);
      (roleSetService.createInvitationExistingActor as Mock).mockResolvedValue(
        mockInvitation
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
        mockInvitation,
      ]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });

      const result = await resolver.inviteForEntryRoleOnRoleSet(
        actorContext(),
        {
          roleSetID: 'rs-1',
          invitedActorIDs: ['user-1'],
          invitedUserEmails: [],
          extraRoles: ['admin'],
        } as any
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(
        RoleSetInvitationResultType.INVITED_TO_ROLE_SET
      );
      // The role guard now runs for every invitee type — ADMIN is forbidden
      // to organizations and Virtual Contributors (maximum 0) but allowed to
      // users, so the definition IS loaded and the invitation still succeeds.
      expect(roleSetService.getRoleDefinitions).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'rs-1' }),
        ['admin']
      );
    });

    it('returns ORGANIZATION_NOT_ACCEPTING_INVITATIONS and creates nothing when the organization opted out', async () => {
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['org-1', 'organization']])
      );
      (
        organizationLookupService.getOrganizationByIdOrFail as Mock
      ).mockResolvedValue({
        settings: { membership: { allowSpaceInvitations: false } },
      });
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.isMember as Mock).mockResolvedValue(false);
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });

      const result = await resolver.inviteForEntryRoleOnRoleSet(
        actorContext(),
        {
          roleSetID: 'rs-1',
          invitedActorIDs: ['org-1'],
          invitedUserEmails: [],
          extraRoles: [],
        } as any
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe(
        RoleSetInvitationResultType.ORGANIZATION_NOT_ACCEPTING_INVITATIONS
      );
      expect(
        roleSetService.createInvitationExistingActor
      ).not.toHaveBeenCalled();
      // A Lead-limit check that never runs must never be reached.
      expect(roleSetService.countActorsWithRole).not.toHaveBeenCalled();
    });

    it.each([
      ['settings.membership is absent entirely', { settings: {} }],
      ['settings itself is absent', {}],
    ])('treats an organization as accepting invitations, without throwing, when %s', async (_label, organization) => {
      // `Organization.applyMembershipSettingsDefaults` (@AfterLoad)
      // early-returns on `!this.settings?.membership`, and
      // organization.entity.spec.ts asserts the key stays undefined in that
      // case — so a row written before migration 1788400000000 ran, or by an
      // old pod mid rolling-deploy, reaches this guard with no `membership`
      // OBJECT. An unguarded deref throws inside the invitee loop and aborts
      // the whole batch, including invitations already created for other
      // invitees. The documented default is "accepting".
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['org-1', 'organization']])
      );
      (
        organizationLookupService.getOrganizationByIdOrFail as Mock
      ).mockResolvedValue(organization);
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.isMember as Mock).mockResolvedValue(false);
      (roleSetService.createInvitationExistingActor as Mock).mockResolvedValue({
        id: 'inv-1',
        invitedActorID: 'org-1',
      });
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
        { id: 'inv-1', invitedActorID: 'org-1' },
      ]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });
      (actorLookupService.getActorTypeByIdOrFail as Mock).mockResolvedValue(
        'organization'
      );

      const result = await resolver.inviteForEntryRoleOnRoleSet(
        actorContext(),
        {
          roleSetID: 'rs-1',
          invitedActorIDs: ['org-1'],
          invitedUserEmails: [],
          extraRoles: [],
        } as any
      );

      expect(result).toHaveLength(1);
      expect(result[0].type).not.toBe(
        RoleSetInvitationResultType.ORGANIZATION_NOT_ACCEPTING_INVITATIONS
      );
      expect(roleSetService.createInvitationExistingActor).toHaveBeenCalled();
    });

    describe('Lead-slot capacity (granted + pending, advisory)', () => {
      const setUpOrganizationLeadInvite = () => {
        (
          actorLookupService.validateActorsAndGetTypes as Mock
        ).mockResolvedValue(new Map([['org-1', 'organization']]));
        (
          organizationLookupService.getOrganizationByIdOrFail as Mock
        ).mockResolvedValue({
          settings: { membership: { allowSpaceInvitations: true } },
        });
        (roleSetService.findOpenInvitation as Mock).mockResolvedValue(
          undefined
        );
        (roleSetService.findOpenApplication as Mock).mockResolvedValue(
          undefined
        );
        (roleSetService.isMember as Mock).mockResolvedValue(false);
        (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([]);
        (
          roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
        ).mockResolvedValue([]);
        (authorizationPolicyService.saveAll as Mock).mockResolvedValue(
          undefined
        );
        (
          communityResolverService.getCommunityForRoleSet as Mock
        ).mockResolvedValue({ id: 'comm-1' });
      };

      it('returns ORGANIZATION_LEAD_ROLE_LIMIT_REACHED when granted Leads already fill the two slots', async () => {
        setUpOrganizationLeadInvite();
        (roleSetService.getRoleDefinition as Mock).mockResolvedValue({
          organizationPolicy: { minimum: 0, maximum: 2 },
        });
        (roleSetService.countActorsWithRole as Mock).mockResolvedValue(2);
        (
          invitationService.countOpenInvitationsForRoleSet as Mock
        ).mockResolvedValue(0);

        const result = await resolver.inviteForEntryRoleOnRoleSet(
          actorContext(),
          {
            roleSetID: 'rs-1',
            invitedActorIDs: ['org-1'],
            invitedUserEmails: [],
            extraRoles: ['lead'],
          } as any
        );

        expect(result[0].type).toBe(
          RoleSetInvitationResultType.ORGANIZATION_LEAD_ROLE_LIMIT_REACHED
        );
        expect(
          roleSetService.createInvitationExistingActor
        ).not.toHaveBeenCalled();
      });

      it('returns ORGANIZATION_LEAD_ROLE_LIMIT_REACHED when granted + pending fill the two slots', async () => {
        setUpOrganizationLeadInvite();
        (roleSetService.getRoleDefinition as Mock).mockResolvedValue({
          organizationPolicy: { minimum: 0, maximum: 2 },
        });
        (roleSetService.countActorsWithRole as Mock).mockResolvedValue(1);
        (
          invitationService.countOpenInvitationsForRoleSet as Mock
        ).mockResolvedValue(1);

        const result = await resolver.inviteForEntryRoleOnRoleSet(
          actorContext(),
          {
            roleSetID: 'rs-1',
            invitedActorIDs: ['org-1'],
            invitedUserEmails: [],
            extraRoles: ['lead'],
          } as any
        );

        expect(result[0].type).toBe(
          RoleSetInvitationResultType.ORGANIZATION_LEAD_ROLE_LIMIT_REACHED
        );
      });

      it('never triggers the limit when the role policy maximum is unlimited (-1)', async () => {
        setUpOrganizationLeadInvite();
        (roleSetService.getRoleDefinition as Mock).mockResolvedValue({
          organizationPolicy: { minimum: 0, maximum: -1 },
        });
        (roleSetService.countActorsWithRole as Mock).mockResolvedValue(50);
        (
          invitationService.countOpenInvitationsForRoleSet as Mock
        ).mockResolvedValue(50);
        const mockInvitation = {
          id: 'inv-1',
          invitedActorID: 'org-1',
        } as any;
        (
          roleSetService.createInvitationExistingActor as Mock
        ).mockResolvedValue(mockInvitation);
        (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
          mockInvitation,
        ]);

        const result = await resolver.inviteForEntryRoleOnRoleSet(
          actorContext(),
          {
            roleSetID: 'rs-1',
            invitedActorIDs: ['org-1'],
            invitedUserEmails: [],
            extraRoles: ['lead'],
          } as any
        );

        expect(result[0].type).toBe(
          RoleSetInvitationResultType.INVITED_TO_ROLE_SET
        );
      });

      it('ignores the Lead limit for a Member-only invite (no extraRoles)', async () => {
        setUpOrganizationLeadInvite();
        const mockInvitation = {
          id: 'inv-1',
          invitedActorID: 'org-1',
        } as any;
        (
          roleSetService.createInvitationExistingActor as Mock
        ).mockResolvedValue(mockInvitation);
        (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
          mockInvitation,
        ]);

        const result = await resolver.inviteForEntryRoleOnRoleSet(
          actorContext(),
          {
            roleSetID: 'rs-1',
            invitedActorIDs: ['org-1'],
            invitedUserEmails: [],
            extraRoles: [],
          } as any
        );

        expect(result[0].type).toBe(
          RoleSetInvitationResultType.INVITED_TO_ROLE_SET
        );
        expect(roleSetService.getRoleDefinition).not.toHaveBeenCalled();
        expect(roleSetService.countActorsWithRole).not.toHaveBeenCalled();
      });

      it('one Lead slot free for two Lead invitees in one call: first sent, second Lead-limit-reached, in submission order', async () => {
        (
          actorLookupService.validateActorsAndGetTypes as Mock
        ).mockResolvedValue(
          new Map([
            ['org-1', 'organization'],
            ['org-2', 'organization'],
          ])
        );
        (
          organizationLookupService.getOrganizationByIdOrFail as Mock
        ).mockResolvedValue({
          settings: { membership: { allowSpaceInvitations: true } },
        });
        (roleSetService.findOpenInvitation as Mock).mockResolvedValue(
          undefined
        );
        (roleSetService.findOpenApplication as Mock).mockResolvedValue(
          undefined
        );
        (roleSetService.isMember as Mock).mockResolvedValue(false);
        (
          roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
        ).mockResolvedValue([]);
        (authorizationPolicyService.saveAll as Mock).mockResolvedValue(
          undefined
        );
        (
          communityResolverService.getCommunityForRoleSet as Mock
        ).mockResolvedValue({ id: 'comm-1' });
        (roleSetService.getRoleDefinition as Mock).mockResolvedValue({
          organizationPolicy: { minimum: 0, maximum: 2 },
        });
        // One Lead slot granted already; the request reads the pending
        // count once (0) and tracks it locally, bumping it to 1 once the
        // first invitee's invitation is created — so a second queued value
        // is unnecessary but harmless if a caller still provides one.
        (roleSetService.countActorsWithRole as Mock).mockResolvedValue(1);
        (
          invitationService.countOpenInvitationsForRoleSet as Mock
        ).mockResolvedValue(0);
        const mockInvitation1 = {
          id: 'inv-org-1',
          invitedActorID: 'org-1',
        } as any;
        (
          roleSetService.createInvitationExistingActor as Mock
        ).mockResolvedValue(mockInvitation1);
        (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
          mockInvitation1,
        ]);

        const result = await resolver.inviteForEntryRoleOnRoleSet(
          actorContext(),
          {
            roleSetID: 'rs-1',
            invitedActorIDs: ['org-1', 'org-2'],
            invitedUserEmails: [],
            extraRoles: ['lead'],
          } as any
        );

        expect(result).toHaveLength(2);
        expect(result[0].type).toBe(
          RoleSetInvitationResultType.INVITED_TO_ROLE_SET
        );
        expect(result[1].type).toBe(
          RoleSetInvitationResultType.ORGANIZATION_LEAD_ROLE_LIMIT_REACHED
        );
        expect(
          roleSetService.createInvitationExistingActor
        ).toHaveBeenCalledTimes(1);
        // The pending-count read is invariant for the whole request and is
        // hoisted out of the per-invitee loop: one query regardless of how
        // many organization Lead invitees are in the batch.
        expect(
          invitationService.countOpenInvitationsForRoleSet
        ).toHaveBeenCalledTimes(1);
        expect(roleSetService.countActorsWithRole).toHaveBeenCalledTimes(1);
      });
    });

    function actorContext() {
      return { actorID: 'user-1' } as any;
    }
  });

  describe('inviteForEntryRoleOnRoleSet - organization zero-admin notice and notification dispatch (T009)', () => {
    const mockRoleSet = {
      id: 'rs-1',
      type: RoleSetType.SPACE,
      authorization: { id: 'auth-1' },
      parentRoleSet: undefined,
    } as any;
    const mockInvitation = {
      id: 'inv-1',
      invitedActorID: 'org-1',
      extraRoles: [],
      invitedToParent: false,
      welcomeMessage: undefined,
    } as any;

    const setUp = () => {
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['org-1', 'organization']])
      );
      (
        organizationLookupService.getOrganizationByIdOrFail as Mock
      ).mockResolvedValue({
        settings: { membership: { allowSpaceInvitations: true } },
      });
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.isMember as Mock).mockResolvedValue(false);
      (roleSetService.createInvitationExistingActor as Mock).mockResolvedValue(
        mockInvitation
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
        mockInvitation,
      ]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });
      (actorLookupService.getActorTypeByIdOrFail as Mock).mockResolvedValue(
        'organization'
      );
    };

    it('sets the zero-admin notice and passes organizationHasNoAdministrators: true to the dispatch', async () => {
      setUp();
      (userLookupService.usersWithCredentials as Mock).mockResolvedValue([]);

      const result = await resolver.inviteForEntryRoleOnRoleSet(
        { actorID: 'user-1' } as any,
        {
          roleSetID: 'rs-1',
          invitedActorIDs: ['org-1'],
          invitedUserEmails: [],
          extraRoles: [],
        } as any
      );

      expect(result[0].type).toBe(
        RoleSetInvitationResultType.INVITED_TO_ROLE_SET
      );
      expect(result[0].notice).toBe('organization-has-no-administrators');
      expect(
        notificationOrganizationAdapter.organizationSpaceCommunityInvitationCreated
      ).toHaveBeenCalledWith(
        expect.objectContaining({ organizationHasNoAdministrators: true })
      );
    });

    it('leaves the notice unset when the organization has at least one owner/admin', async () => {
      setUp();
      (userLookupService.usersWithCredentials as Mock).mockResolvedValue([
        { id: 'owner-1' },
      ]);

      const result = await resolver.inviteForEntryRoleOnRoleSet(
        { actorID: 'user-1' } as any,
        {
          roleSetID: 'rs-1',
          invitedActorIDs: ['org-1'],
          invitedUserEmails: [],
          extraRoles: [],
        } as any
      );

      expect(result[0].notice).toBeUndefined();
      expect(
        notificationOrganizationAdapter.organizationSpaceCommunityInvitationCreated
      ).toHaveBeenCalledWith(
        expect.objectContaining({ organizationHasNoAdministrators: false })
      );
    });

    it('never dispatches the organization adapter for a non-organization invitee', async () => {
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      // Keyed by the ID the mutation is actually called with below. Keying it
      // by the *caller* (`user-1`) made `actorTypes.get('user-2')` resolve to
      // `undefined`, so the organization guard was skipped for the trivial
      // reason that the invitee had no type at all — the assertions then held
      // even if the guard were wired wrongly.
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['user-2', 'user']])
      );
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.isMember as Mock).mockResolvedValue(false);
      (roleSetService.createInvitationExistingActor as Mock).mockResolvedValue({
        id: 'inv-2',
        invitedActorID: 'user-2',
      });
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
        { id: 'inv-2', invitedActorID: 'user-2' },
      ]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });
      (actorLookupService.getActorTypeByIdOrFail as Mock).mockResolvedValue(
        'user'
      );

      await resolver.inviteForEntryRoleOnRoleSet(
        { actorID: 'user-1' } as any,
        {
          roleSetID: 'rs-1',
          invitedActorIDs: ['user-2'],
          invitedUserEmails: [],
          extraRoles: [],
        } as any
      );

      expect(
        notificationOrganizationAdapter.organizationSpaceCommunityInvitationCreated
      ).not.toHaveBeenCalled();
      expect(userLookupService.usersWithCredentials).not.toHaveBeenCalled();
    });
  });

  describe('inviteForEntryRoleOnRoleSet - new email users', () => {
    it('should create platform invitations for new email users', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        parentRoleSet: undefined,
      } as any;
      const mockPlatformInvitation = {
        id: 'pinv-1',
        email: 'new@test.com',
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map()
      );
      // getUserByEmail returns null (user doesn't exist)
      (userLookupService.getUserByEmail as Mock).mockResolvedValue(undefined);
      // No existing platform invitation
      const platformInvitationService = (resolver as any)
        .platformInvitationService;
      (
        platformInvitationService.getExistingPlatformInvitationForRoleSet as Mock
      ).mockResolvedValue(undefined);
      (roleSetService.createPlatformInvitation as Mock).mockResolvedValue(
        mockPlatformInvitation
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });

      const result = await resolver.inviteForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-1',
        invitedActorIDs: [],
        invitedUserEmails: ['new@test.com'],
        extraRoles: [],
      } as any);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('invited-to-platform-and-role-set');
    });

    it('should handle already-invited platform email', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        parentRoleSet: undefined,
      } as any;
      const existingPInv = {
        id: 'pinv-existing',
        email: 'already@test.com',
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map()
      );
      (userLookupService.getUserByEmail as Mock).mockResolvedValue(undefined);
      // Existing platform invitation
      const platformInvitationService = (resolver as any)
        .platformInvitationService;
      (
        platformInvitationService.getExistingPlatformInvitationForRoleSet as Mock
      ).mockResolvedValue(existingPInv);
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });

      const result = await resolver.inviteForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-1',
        invitedActorIDs: [],
        invitedUserEmails: ['already@test.com'],
        extraRoles: [],
      } as any);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('already-invited-to-platform-and-role-set');
    });

    it('should handle parent roleSet with authorization check', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const parentAuth = { id: 'parent-auth' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-1' },
        parentRoleSet: {
          id: 'parent-rs',
          authorization: parentAuth,
          parentRoleSet: undefined,
        },
      } as any;
      const mockInvitation = { id: 'inv-1', invitedActorID: 'actor-1' } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      // isAccessGranted for parent check
      (authorizationService.isAccessGranted as Mock).mockReturnValue(true);
      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['actor-1', 'user']])
      );
      // inviteActorsToEntryRole: actor is not member of parent
      (roleSetService.isMember as Mock).mockResolvedValue(false);
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.createInvitationExistingActor as Mock).mockResolvedValue(
        mockInvitation
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
        mockInvitation,
      ]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-1' });

      const result = await resolver.inviteForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-1',
        invitedActorIDs: ['actor-1'],
        invitedUserEmails: [],
        extraRoles: [],
      } as any);

      expect(result).toHaveLength(1);
      expect(authorizationService.isAccessGranted).toHaveBeenCalled();
    });
  });

  describe('eventOnApplication', () => {
    it('should trigger event on application', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockApplication = {
        id: 'app-1',
        authorization: { id: 'auth-1' },
        lifecycle: { id: 'lc-1' },
        user: { id: 'user-1' },
        roleSet: { id: 'rs-1' },
      } as any;

      (applicationService.getApplicationOrFail as Mock).mockResolvedValue(
        mockApplication
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (lifecycleService.event as Mock).mockResolvedValue(undefined);
      (lifecycleService.getState as Mock).mockReturnValue('new');
      (
        roleSetCacheService.deleteOpenApplicationFromCache as Mock
      ).mockResolvedValue(undefined);
      (
        roleSetCacheService.deleteMembershipStatusCache as Mock
      ).mockResolvedValue(undefined);
      (roleSetCacheService.setActorIsMemberCache as Mock).mockResolvedValue(
        undefined
      );

      const result = await resolver.eventOnApplication(
        { applicationID: 'app-1', eventName: 'APPROVE' } as any,
        actorContext
      );

      expect(result).toBe(mockApplication);
    });

    describe('ORGANIZATION (FR-014)', () => {
      const arrangeCommon = (mockApplication: any, finalState: string) => {
        (applicationService.getApplicationOrFail as Mock)
          // First load (before the event)
          .mockResolvedValueOnce(mockApplication)
          // Reload after the event
          .mockResolvedValueOnce(mockApplication)
          // Final return
          .mockResolvedValueOnce(mockApplication);
        (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
          undefined
        );
        (lifecycleService.event as Mock).mockResolvedValue(undefined);
        (lifecycleService.getState as Mock).mockReturnValue(finalState);
        (roleSetService.approveApplication as Mock).mockResolvedValue(
          undefined
        );
        (
          roleSetCacheService.deleteOpenApplicationFromCache as Mock
        ).mockResolvedValue(undefined);
        (
          roleSetCacheService.deleteMembershipStatusCache as Mock
        ).mockResolvedValue(undefined);
        (roleSetCacheService.setActorIsMemberCache as Mock).mockResolvedValue(
          undefined
        );
        (
          organizationLookupService.getOrganizationForRoleSetOrFail as Mock
        ).mockResolvedValue({ id: 'org-1' });
      };

      it('dispatches userOrganizationAssociateApplicationApproved on approval, never the Space decline path', async () => {
        const mockApplication = {
          id: 'app-1',
          authorization: { id: 'auth-1' },
          lifecycle: { id: 'lc-1' },
          user: { id: 'applicant-1' },
          roleSet: { id: 'org-rs-1', type: RoleSetType.ORGANIZATION },
        } as any;
        arrangeCommon(mockApplication, 'approved');

        await resolver.eventOnApplication(
          { applicationID: 'app-1', eventName: 'APPROVE' } as any,
          { actorID: 'admin-1' } as any
        );

        expect(
          notificationUserAdapter.userOrganizationAssociateApplicationApproved
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationID: 'org-1',
            applicationID: 'app-1',
            applicantID: 'applicant-1',
          })
        );
        expect(
          notificationUserAdapter.userSpaceCommunityApplicationDeclined
        ).not.toHaveBeenCalled();
      });

      it('dispatches userOrganizationAssociateApplicationDeclined on rejection, never getCommunityForRoleSet', async () => {
        const mockApplication = {
          id: 'app-1',
          authorization: { id: 'auth-1' },
          lifecycle: { id: 'lc-1' },
          user: { id: 'applicant-1' },
          roleSet: { id: 'org-rs-1', type: RoleSetType.ORGANIZATION },
        } as any;
        arrangeCommon(mockApplication, 'rejected');

        await resolver.eventOnApplication(
          { applicationID: 'app-1', eventName: 'REJECT' } as any,
          { actorID: 'admin-1' } as any
        );

        expect(
          notificationUserAdapter.userOrganizationAssociateApplicationDeclined
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationID: 'org-1',
            applicationID: 'app-1',
            applicantID: 'applicant-1',
          })
        );
        expect(
          communityResolverService.getCommunityForRoleSet
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('eventOnInvitation', () => {
    it('should trigger event on invitation', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        authorization: { id: 'auth-1' },
        lifecycle: { id: 'lc-1' },
        invitedActorID: 'actor-1',
        roleSet: { id: 'rs-1' },
      } as any;

      (invitationService.getInvitationOrFail as Mock).mockResolvedValue(
        mockInvitation
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (lifecycleService.event as Mock).mockResolvedValue(undefined);
      (invitationService.getLifecycleState as Mock).mockResolvedValue('new');
      (lifecycleService.getState as Mock).mockReturnValue('new');
      (
        roleSetCacheService.deleteOpenInvitationFromCache as Mock
      ).mockResolvedValue(undefined);
      (
        roleSetCacheService.deleteMembershipStatusCache as Mock
      ).mockResolvedValue(undefined);
      (roleSetCacheService.setActorIsMemberCache as Mock).mockResolvedValue(
        undefined
      );

      // Mock actorLookupService
      const actorLookupService = (resolver as any).actorLookupService;
      (actorLookupService.getActorTypeById as Mock).mockResolvedValue('user');

      const result = await resolver.eventOnInvitation(
        { invitationID: 'inv-1', eventName: 'ACCEPT' } as any,
        actorContext
      );

      expect(result).toBe(mockInvitation);
    });

    it('requires the ACCEPT-specific privilege (not just UPDATE) for an ACCEPT event, so a generic UPDATE holder cannot accept on the invited actor behalf', async () => {
      const actorContext = { actorID: 'global-admin-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        authorization: { id: 'auth-1' },
        lifecycle: { id: 'lc-1' },
        invitedActorID: 'org-1',
        roleSet: { id: 'rs-1' },
      } as any;

      (invitationService.getInvitationOrFail as Mock).mockResolvedValue(
        mockInvitation
      );
      // Generic UPDATE is granted (e.g. inherited global admin authorization),
      // but the ACCEPT-specific privilege is not.
      (authorizationService.grantAccessOrFail as Mock).mockImplementation(
        (_actorContext, _authorization, privilege) => {
          if (
            privilege ===
            AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE_ACCEPT
          ) {
            throw new ForbiddenAuthorizationPolicyException(
              'not permitted to accept',
              privilege,
              'auth-1',
              'global-admin-1'
            );
          }
          return undefined;
        }
      );

      await expect(
        resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'ACCEPT' } as any,
          actorContext
        )
      ).rejects.toThrow(ForbiddenAuthorizationPolicyException);

      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockInvitation.authorization,
        AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE_ACCEPT,
        expect.any(String)
      );
      // The event must never reach the lifecycle machine once the
      // ACCEPT-specific check has failed.
      expect(lifecycleService.event).not.toHaveBeenCalled();
    });

    it('requires the invite-accept (consent) privilege for a REJECT event too', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        authorization: { id: 'auth-1' },
        lifecycle: { id: 'lc-1' },
        invitedActorID: 'actor-1',
        roleSet: { id: 'rs-1' },
      } as any;

      (invitationService.getInvitationOrFail as Mock).mockResolvedValue(
        mockInvitation
      );
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (lifecycleService.event as Mock).mockResolvedValue(undefined);
      (invitationService.getLifecycleState as Mock).mockResolvedValue(
        'invited'
      );
      (lifecycleService.getState as Mock).mockReturnValue('rejected');
      (
        roleSetCacheService.deleteOpenInvitationFromCache as Mock
      ).mockResolvedValue(undefined);
      (
        roleSetCacheService.deleteMembershipStatusCache as Mock
      ).mockResolvedValue(undefined);
      (roleSetCacheService.setActorIsMemberCache as Mock).mockResolvedValue(
        undefined
      );

      const actorLookupService = (resolver as any).actorLookupService;
      (actorLookupService.getActorTypeById as Mock).mockResolvedValue('user');

      await resolver.eventOnInvitation(
        { invitationID: 'inv-1', eventName: 'REJECT' } as any,
        actorContext
      );

      // FR-010: declining is the invited actor's own consent decision. A
      // generic UPDATE holder (e.g. a global admin) may REVOKE the
      // invitation but must not answer it for the invitee — doing so would
      // additionally tell the Space admins the invitee declined.
      expect(authorizationService.grantAccessOrFail).toHaveBeenCalledWith(
        actorContext,
        mockInvitation.authorization,
        AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE_ACCEPT,
        expect.any(String)
      );
    });

    describe('organization accept/decline outcome dispatch (T016)', () => {
      const setUp = (createdBy: string | undefined) => {
        const mockInvitation = {
          id: 'inv-1',
          authorization: { id: 'auth-1' },
          lifecycle: { id: 'lc-1' },
          invitedActorID: 'org-1',
          roleSet: { id: 'rs-1' },
          createdBy,
        } as any;

        (invitationService.getInvitationOrFail as Mock).mockResolvedValue(
          mockInvitation
        );
        (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
          undefined
        );
        (lifecycleService.event as Mock).mockResolvedValue(undefined);
        (
          roleSetCacheService.deleteOpenInvitationFromCache as Mock
        ).mockResolvedValue(undefined);
        (
          roleSetCacheService.deleteMembershipStatusCache as Mock
        ).mockResolvedValue(undefined);
        (roleSetCacheService.setActorIsMemberCache as Mock).mockResolvedValue(
          undefined
        );
        (
          communityResolverService.getSpaceForRoleSetOrFail as Mock
        ).mockResolvedValue({ id: 'space-1' });

        const actorLookupService = (resolver as any).actorLookupService;
        (actorLookupService.getActorTypeById as Mock).mockResolvedValue(
          'organization'
        );

        return mockInvitation;
      };

      it('dispatches spaceAdminOrganizationInvitationAccepted when the invitation is accepted', async () => {
        setUp('inviter-1');
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'accepting'
        );
        (roleSetService.acceptInvitationToRoleSet as Mock).mockResolvedValue(
          undefined
        );
        (lifecycleService.getState as Mock).mockReturnValue('accepted');

        await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'ACCEPT' } as any,
          { actorID: 'org-admin-1' } as any
        );

        expect(
          notificationAdapterSpace.spaceAdminOrganizationInvitationAccepted
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            triggeredBy: 'org-admin-1',
            invitationCreatedBy: 'inviter-1',
            invitedActorID: 'org-1',
            spaceID: 'space-1',
          }),
          expect.objectContaining({ id: 'space-1' })
        );
        expect(
          notificationAdapterSpace.spaceAdminOrganizationInvitationDeclined
        ).not.toHaveBeenCalled();
      });

      it('still dispatches accepted when the inviter no longer exists (createdBy null)', async () => {
        // The event goes to every Space admin, not only the inviter, so a
        // deleted inviter must not silence it — with the generic "new member
        // joined" suppressed, that would leave the Space told nothing.
        setUp(undefined);
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'accepting'
        );
        (roleSetService.acceptInvitationToRoleSet as Mock).mockResolvedValue(
          undefined
        );
        (lifecycleService.getState as Mock).mockReturnValue('accepted');

        const result = await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'ACCEPT' } as any,
          { actorID: 'org-admin-1' } as any
        );

        expect(result).toBeDefined();
        expect(
          notificationAdapterSpace.spaceAdminOrganizationInvitationAccepted
        ).toHaveBeenCalledWith(
          expect.objectContaining({ invitationCreatedBy: '' }),
          expect.objectContaining({ id: 'space-1' })
        );
      });

      it('dispatches spaceAdminOrganizationInvitationDeclined when the invitation is rejected', async () => {
        setUp('inviter-1');
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'invited'
        );
        (lifecycleService.getState as Mock).mockReturnValue('rejected');

        await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'REJECT' } as any,
          { actorID: 'org-admin-1' } as any
        );

        expect(
          notificationAdapterSpace.spaceAdminOrganizationInvitationDeclined
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            triggeredBy: 'org-admin-1',
            invitationCreatedBy: 'inviter-1',
            invitedActorID: 'org-1',
            spaceID: 'space-1',
          }),
          expect.objectContaining({ id: 'space-1' })
        );
        expect(
          notificationAdapterSpace.spaceAdminOrganizationInvitationAccepted
        ).not.toHaveBeenCalled();
      });

      it('still dispatches declined when the inviter no longer exists (createdBy null)', async () => {
        setUp(undefined);
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'invited'
        );
        (lifecycleService.getState as Mock).mockReturnValue('rejected');

        const result = await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'REJECT' } as any,
          { actorID: 'org-admin-1' } as any
        );

        expect(result).toBeDefined();
        expect(
          notificationAdapterSpace.spaceAdminOrganizationInvitationDeclined
        ).toHaveBeenCalledWith(
          expect.objectContaining({ invitationCreatedBy: '' }),
          expect.objectContaining({ id: 'space-1' })
        );
      });

      it('dispatches the organization "joined" welcome to the org admins on accept', async () => {
        setUp('inviter-1');
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'accepting'
        );
        (roleSetService.acceptInvitationToRoleSet as Mock).mockResolvedValue(
          undefined
        );
        (lifecycleService.getState as Mock).mockReturnValue('accepted');

        await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'ACCEPT' } as any,
          { actorID: 'org-admin-1' } as any
        );

        expect(
          notificationOrganizationAdapter.organizationSpaceCommunityJoined
        ).toHaveBeenCalledWith({
          triggeredBy: 'org-admin-1',
          organizationID: 'org-1',
          spaceID: 'space-1',
        });
      });

      it('does not dispatch the organization "joined" welcome on decline', async () => {
        setUp('inviter-1');
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'invited'
        );
        (lifecycleService.getState as Mock).mockReturnValue('rejected');

        await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'REJECT' } as any,
          { actorID: 'org-admin-1' } as any
        );

        expect(
          notificationOrganizationAdapter.organizationSpaceCommunityJoined
        ).not.toHaveBeenCalled();
      });

      it('never dispatches the organization outcome adapters for a Virtual Contributor invitee (unchanged VC path)', async () => {
        const mockInvitation = {
          id: 'inv-1',
          authorization: { id: 'auth-1' },
          lifecycle: { id: 'lc-1' },
          invitedActorID: 'vc-1',
          roleSet: { id: 'rs-1' },
          createdBy: 'inviter-1',
        } as any;
        (invitationService.getInvitationOrFail as Mock).mockResolvedValue(
          mockInvitation
        );
        (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
          undefined
        );
        (lifecycleService.event as Mock).mockResolvedValue(undefined);
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'invited'
        );
        (lifecycleService.getState as Mock).mockReturnValue('rejected');
        (
          roleSetCacheService.deleteOpenInvitationFromCache as Mock
        ).mockResolvedValue(undefined);
        (
          roleSetCacheService.deleteMembershipStatusCache as Mock
        ).mockResolvedValue(undefined);
        (roleSetCacheService.setActorIsMemberCache as Mock).mockResolvedValue(
          undefined
        );
        (
          communityResolverService.getCommunityForRoleSet as Mock
        ).mockResolvedValue({ id: 'comm-1' });
        (
          communityResolverService.getSpaceForCommunityOrFail as Mock
        ).mockResolvedValue({ id: 'space-1' });
        const actorLookupService = (resolver as any).actorLookupService;
        (actorLookupService.getActorTypeById as Mock).mockResolvedValue(
          'virtual-contributor'
        );

        await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'REJECT' } as any,
          { actorID: 'org-admin-1' } as any
        );

        expect(
          notificationAdapterSpace.spaceAdminVirtualContributorInvitationDeclined
        ).toHaveBeenCalled();
        expect(
          notificationAdapterSpace.spaceAdminOrganizationInvitationDeclined
        ).not.toHaveBeenCalled();
        expect(
          notificationAdapterSpace.spaceAdminOrganizationInvitationAccepted
        ).not.toHaveBeenCalled();
      });
    });

    describe('user accept/decline outcome dispatch', () => {
      const setUpUser = (createdBy: string | undefined) => {
        const mockInvitation = {
          id: 'inv-1',
          authorization: { id: 'auth-1' },
          lifecycle: { id: 'lc-1' },
          invitedActorID: 'user-9',
          roleSet: { id: 'rs-1' },
          createdBy,
        } as any;

        (invitationService.getInvitationOrFail as Mock).mockResolvedValue(
          mockInvitation
        );
        (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
          undefined
        );
        (lifecycleService.event as Mock).mockResolvedValue(undefined);
        (
          roleSetCacheService.deleteOpenInvitationFromCache as Mock
        ).mockResolvedValue(undefined);
        (
          roleSetCacheService.deleteMembershipStatusCache as Mock
        ).mockResolvedValue(undefined);
        (roleSetCacheService.setActorIsMemberCache as Mock).mockResolvedValue(
          undefined
        );
        (
          communityResolverService.getSpaceForRoleSetOrFail as Mock
        ).mockResolvedValue({ id: 'space-1' });

        const actorLookupService = (resolver as any).actorLookupService;
        (actorLookupService.getActorTypeById as Mock).mockResolvedValue('user');

        return mockInvitation;
      };

      it('dispatches spaceAdminUserInvitationAccepted to the inviter on accept', async () => {
        setUpUser('inviter-1');
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'accepting'
        );
        (roleSetService.acceptInvitationToRoleSet as Mock).mockResolvedValue(
          undefined
        );
        (lifecycleService.getState as Mock).mockReturnValue('accepted');

        await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'ACCEPT' } as any,
          { actorID: 'user-9' } as any
        );

        expect(
          notificationAdapterSpace.spaceAdminUserInvitationAccepted
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            triggeredBy: 'user-9',
            invitationCreatedBy: 'inviter-1',
            invitedActorID: 'user-9',
            spaceID: 'space-1',
          }),
          expect.objectContaining({ id: 'space-1' })
        );
        expect(
          notificationAdapterSpace.spaceAdminOrganizationInvitationAccepted
        ).not.toHaveBeenCalled();
        expect(
          notificationOrganizationAdapter.organizationSpaceCommunityJoined
        ).not.toHaveBeenCalled();
      });

      it('dispatches spaceAdminUserInvitationDeclined to the inviter on decline', async () => {
        setUpUser('inviter-1');
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'invited'
        );
        (lifecycleService.getState as Mock).mockReturnValue('rejected');

        await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'REJECT' } as any,
          { actorID: 'user-9' } as any
        );

        expect(
          notificationAdapterSpace.spaceAdminUserInvitationDeclined
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            invitedActorID: 'user-9',
            invitationCreatedBy: 'inviter-1',
          }),
          expect.objectContaining({ id: 'space-1' })
        );
      });

      it('still dispatches the user outcome when the inviter no longer exists', async () => {
        setUpUser(undefined);
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'invited'
        );
        (lifecycleService.getState as Mock).mockReturnValue('rejected');

        await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'REJECT' } as any,
          { actorID: 'user-9' } as any
        );

        expect(
          notificationAdapterSpace.spaceAdminUserInvitationDeclined
        ).toHaveBeenCalledWith(
          expect.objectContaining({ invitationCreatedBy: '' }),
          expect.objectContaining({ id: 'space-1' })
        );
      });
    });

    describe('ORGANIZATION (US2/FR-003, no Space lookup reachable)', () => {
      const mockInvitation = {
        id: 'inv-1',
        authorization: { id: 'auth-1' },
        lifecycle: { id: 'lc-1' },
        invitedActorID: 'invitee-1',
        extraRoles: ['owner'],
        roleSet: { id: 'org-rs-1', type: RoleSetType.ORGANIZATION },
      } as any;

      const arrange = (invitationState: string) => {
        (invitationService.getInvitationOrFail as Mock).mockResolvedValue(
          mockInvitation
        );
        (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
          undefined
        );
        (lifecycleService.event as Mock).mockResolvedValue(undefined);
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'invited'
        );
        (lifecycleService.getState as Mock).mockReturnValue(invitationState);
        (
          roleSetCacheService.deleteOpenInvitationFromCache as Mock
        ).mockResolvedValue(undefined);
        (
          roleSetCacheService.deleteMembershipStatusCache as Mock
        ).mockResolvedValue(undefined);
        (roleSetCacheService.setActorIsMemberCache as Mock).mockResolvedValue(
          undefined
        );
        (
          organizationLookupService.getOrganizationForRoleSetOrFail as Mock
        ).mockResolvedValue({ id: 'org-1' });
        const actorLookupServiceAny = (resolver as any).actorLookupService;
        (actorLookupServiceAny.getActorTypeById as Mock).mockResolvedValue(
          'user'
        );
      };

      it('on accept: grants and reports a withheld extra role, dispatches organizationAdminAssociateInvitationAccepted, never touches a Space', async () => {
        arrange('accepted');
        (invitationService.getLifecycleState as Mock).mockResolvedValue(
          'accepting'
        );
        (roleSetService.acceptInvitationToRoleSet as Mock).mockResolvedValue({
          extraRolesWithheld: ['owner'],
        });

        const result = await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'ACCEPT' } as any,
          { actorID: 'admin-1' } as any
        );

        expect(result.extraRolesWithheld).toEqual(['owner']);
        expect(
          notificationOrganizationAdapter.organizationAdminAssociateInvitationAccepted
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationID: 'org-1',
            invitationID: 'inv-1',
            inviteeID: 'invitee-1',
            extraRolesWithheld: ['owner'],
          })
        );
        expect(
          communityResolverService.getSpaceForRoleSetOrFail
        ).not.toHaveBeenCalled();
        expect(
          communityResolverService.getCommunityForRoleSet
        ).not.toHaveBeenCalled();
      });

      it('on decline: dispatches organizationAdminAssociateInvitationDeclined, never touches a Space', async () => {
        arrange('rejected');

        await resolver.eventOnInvitation(
          { invitationID: 'inv-1', eventName: 'REJECT' } as any,
          { actorID: 'admin-1' } as any
        );

        expect(
          notificationOrganizationAdapter.organizationAdminAssociateInvitationDeclined
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            organizationID: 'org-1',
            invitationID: 'inv-1',
            inviteeID: 'invitee-1',
          })
        );
        expect(
          communityResolverService.getSpaceForCommunityOrFail
        ).not.toHaveBeenCalled();
      });
    });
  });

  describe('updateApplicationFormOnRoleSet', () => {
    it('should update application form', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        authorization: { id: 'auth-1' },
      } as any;
      const updatedRoleSet = { ...mockRoleSet, applicationForm: {} } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (roleSetService.updateApplicationForm as Mock).mockResolvedValue(
        updatedRoleSet
      );

      const result = await resolver.updateApplicationFormOnRoleSet(
        actorContext,
        { roleSetID: 'rs-1', formData: {} } as any
      );

      expect(result).toBe(updatedRoleSet);
    });
  });

  // Verifies that inviteForEntryRoleOnRoleSet threads suggestedLanguage into
  // BOTH the Invitation (existing-actor path) and PlatformInvitation (new-email
  // path), and that the compose-time eligible guard fires before any row is written.
  describe('inviteForEntryRoleOnRoleSet - suggestedLanguage fan-out', () => {
    // Shared helpers to reduce boilerplate across the three sub-tests.
    function setupBaseRoleSet() {
      const mockRoleSet = {
        id: 'rs-fan',
        type: RoleSetType.SPACE,
        authorization: { id: 'auth-fan' },
        parentRoleSet: undefined,
        license: { entitlements: [] },
      } as any;
      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);
      (authorizationService.grantAccessOrFail as Mock).mockReturnValue(
        undefined
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([]);
      (
        roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications as Mock
      ).mockResolvedValue([]);
      (authorizationPolicyService.saveAll as Mock).mockResolvedValue(undefined);
      (
        communityResolverService.getCommunityForRoleSet as Mock
      ).mockResolvedValue({ id: 'comm-fan' });
      return mockRoleSet;
    }

    it('should pass suggestedLanguage nl to CreateInvitationInput for existing actor (Invitation entity path)', async () => {
      // Batch: 1 existing actor, suggestedLanguage 'nl' — verifies the
      // Invitation entity receives the suggested language.
      const actorContext = { actorID: 'user-1' } as any;
      setupBaseRoleSet();

      // eligible set includes 'nl' — guard must pass
      (eligibleLanguageGuard.isEligibleLanguageOrFail as Mock).mockReturnValue(
        undefined
      );

      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['actor-1', 'user']])
      );
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.isMember as Mock).mockResolvedValue(false);

      const mockInvitation = {
        id: 'inv-fan',
        invitedActorID: 'actor-1',
        suggestedLanguage: 'nl',
      } as any;
      (roleSetService.createInvitationExistingActor as Mock).mockResolvedValue(
        mockInvitation
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
        mockInvitation,
      ]);

      await resolver.inviteForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-fan',
        invitedActorIDs: ['actor-1'],
        invitedUserEmails: [],
        extraRoles: [],
        suggestedLanguage: 'nl',
      } as any);

      // createInvitationExistingActor must receive a CreateInvitationInput
      // that carries suggestedLanguage: 'nl' (Invitation entity path).
      expect(roleSetService.createInvitationExistingActor).toHaveBeenCalledWith(
        expect.objectContaining({ suggestedLanguage: 'nl' })
      );
    });

    it('should pass suggestedLanguage nl to createPlatformInvitation for new email users (PlatformInvitation entity path)', async () => {
      // Batch: 2 new email users, suggestedLanguage 'nl' — verifies the
      // PlatformInvitation entity receives the suggested language.
      const actorContext = { actorID: 'user-1' } as any;
      setupBaseRoleSet();

      (eligibleLanguageGuard.isEligibleLanguageOrFail as Mock).mockReturnValue(
        undefined
      );

      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map()
      );
      // Both emails are genuinely new users (not found by getUserByEmail)
      (userLookupService.getUserByEmail as Mock).mockResolvedValue(undefined);

      const platformInvitationSvc = (resolver as any).platformInvitationService;
      (
        platformInvitationSvc.getExistingPlatformInvitationForRoleSet as Mock
      ).mockResolvedValue(undefined);

      const mockPInv1 = {
        id: 'pinv-1',
        email: 'new1@test.com',
        suggestedLanguage: 'nl',
      } as any;
      const mockPInv2 = {
        id: 'pinv-2',
        email: 'new2@test.com',
        suggestedLanguage: 'nl',
      } as any;
      (roleSetService.createPlatformInvitation as Mock)
        .mockResolvedValueOnce(mockPInv1)
        .mockResolvedValueOnce(mockPInv2);

      await resolver.inviteForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-fan',
        invitedActorIDs: [],
        invitedUserEmails: ['new1@test.com', 'new2@test.com'],
        extraRoles: [],
        suggestedLanguage: 'nl',
      } as any);

      // Both PlatformInvitation rows must receive suggestedLanguage: 'nl'
      // (verifies the fan-out helper threads the field through each path).
      expect(roleSetService.createPlatformInvitation).toHaveBeenCalledTimes(2);
      expect(roleSetService.createPlatformInvitation).toHaveBeenNthCalledWith(
        1,
        expect.anything(), // roleSet
        'new1@test.com',
        expect.anything(), // welcomeMessage
        expect.anything(), // inviteToParentRoleSet
        expect.anything(), // extraRoles
        expect.anything(), // actorContext
        'nl' // suggestedLanguage must be threaded through
      );
      expect(roleSetService.createPlatformInvitation).toHaveBeenNthCalledWith(
        2,
        expect.anything(),
        'new2@test.com',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'nl'
      );
    });

    it('should send null suggestedLanguage when omitted — invitation succeeds and no language is recorded', async () => {
      // Batch with no suggestedLanguage — both entity paths should receive
      // undefined/null and the mutation must still succeed.
      const actorContext = { actorID: 'user-1' } as any;
      setupBaseRoleSet();

      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['actor-omit', 'user']])
      );
      (roleSetService.findOpenInvitation as Mock).mockResolvedValue(undefined);
      (roleSetService.findOpenApplication as Mock).mockResolvedValue(undefined);
      (roleSetService.isMember as Mock).mockResolvedValue(false);

      const mockInvitationOmit = {
        id: 'inv-omit',
        invitedActorID: 'actor-omit',
        suggestedLanguage: undefined,
      } as any;
      (roleSetService.createInvitationExistingActor as Mock).mockResolvedValue(
        mockInvitationOmit
      );
      (invitationService.getInvitationsOrFail as Mock).mockResolvedValue([
        mockInvitationOmit,
      ]);

      const result = await resolver.inviteForEntryRoleOnRoleSet(actorContext, {
        roleSetID: 'rs-fan',
        invitedActorIDs: ['actor-omit'],
        invitedUserEmails: [],
        extraRoles: [],
        // no suggestedLanguage field
      } as any);

      // The guard must NOT be called when suggestedLanguage is absent
      expect(
        eligibleLanguageGuard.isEligibleLanguageOrFail
      ).not.toHaveBeenCalled();
      // The mutation must succeed and produce one invitation result
      expect(result).toHaveLength(1);
      // The CreateInvitationInput must carry undefined (not a stale 'nl')
      expect(roleSetService.createInvitationExistingActor).toHaveBeenCalledWith(
        expect.objectContaining({ suggestedLanguage: undefined })
      );
    });

    it('should reject suggestedLanguage de before any row is written (compose-time guard)', async () => {
      // 'de' is in the supported set but NOT in the eligible set.
      // isEligibleLanguageOrFail must throw a ValidationException before
      // createInvitationExistingActor or createPlatformInvitation is called.
      const actorContext = { actorID: 'user-1' } as any;
      setupBaseRoleSet();

      (actorLookupService.validateActorsAndGetTypes as Mock).mockResolvedValue(
        new Map([['actor-de', 'user']])
      );

      // Simulate the guard throwing for 'de' (as it would when eligible=['nl'])
      (
        eligibleLanguageGuard.isEligibleLanguageOrFail as Mock
      ).mockImplementation(() => {
        throw new ValidationException(
          "Suggested language 'de' is not in the eligible set [nl].",
          LogContext.COMMUNITY
        );
      });

      await expect(
        resolver.inviteForEntryRoleOnRoleSet(actorContext, {
          roleSetID: 'rs-fan',
          invitedActorIDs: ['actor-de'],
          invitedUserEmails: [],
          extraRoles: [],
          suggestedLanguage: 'de',
        } as any)
      ).rejects.toThrow(ValidationException);

      // No invitation row must be written — the guard fires up front
      expect(
        roleSetService.createInvitationExistingActor
      ).not.toHaveBeenCalled();
      expect(roleSetService.createPlatformInvitation).not.toHaveBeenCalled();
    });
  });
});
