import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { RoleName } from '@common/enums/role.name';
import { RoleSetInvitationResultType } from '@common/enums/role.set.invitation.result.type';
import { RoleSetType } from '@common/enums/role.set.type';
import { ValidationException } from '@common/exceptions';
import { RoleSetInvitationException } from '@common/exceptions/role.set.invitation.exception';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ApplicationService } from '@domain/access/application/application.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
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
  let communityResolverService: CommunityResolverService;
  let authorizationPolicyService: AuthorizationPolicyService;

  beforeEach(async () => {
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
    communityResolverService = module.get<CommunityResolverService>(
      CommunityResolverService
    );
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('joinRoleSet', () => {
    it('should join roleSet when type is SPACE', async () => {
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
      (roleSetService.assignActorToRole as Mock).mockResolvedValue('user-1');

      const result = await resolver.joinRoleSet(actorContext, {
        roleSetID: 'rs-1',
      } as any);

      expect(result).toBe(mockRoleSet);
      expect(roleSetService.assignActorToRole).toHaveBeenCalledWith(
        mockRoleSet,
        RoleName.MEMBER,
        'user-1',
        actorContext,
        true
      );
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

    it('should throw when roleSet type is not SPACE', async () => {
      const actorContext = { actorID: 'user-1' } as any;
      const mockRoleSet = {
        id: 'rs-1',
        type: RoleSetType.ORGANIZATION,
        authorization: { id: 'auth-1' },
      } as any;

      (roleSetService.getRoleSetOrFail as Mock).mockResolvedValue(mockRoleSet);

      await expect(
        resolver.joinRoleSet(actorContext, { roleSetID: 'rs-1' } as any)
      ).rejects.toThrow(ValidationException);
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

      await expect(
        resolver.applyForEntryRoleOnRoleSet(actorContext, {
          roleSetID: 'rs-1',
          questions: [],
        } as any)
      ).rejects.toThrow(RoleSetMembershipException);
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
});
