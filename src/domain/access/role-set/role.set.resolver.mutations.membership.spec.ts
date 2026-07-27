import { LogContext } from '@common/enums';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
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
  let communityResolverService: CommunityResolverService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let eligibleLanguageGuard: RoleSetEligibleLanguageGuard;

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

  // T008 — suggestedLanguage fan-out (R-5 / R-7 mitigations, DL-8)
  // Verifies that inviteForEntryRoleOnRoleSet threads suggestedLanguage into
  // BOTH the Invitation (existing-actor path) and PlatformInvitation (new-email
  // path), and that the compose-time eligible guard fires before any row is
  // written (DL-8).
  describe('inviteForEntryRoleOnRoleSet - suggestedLanguage fan-out (T008)', () => {
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

    it('should pass suggestedLanguage nl to CreateInvitationInput for existing actor (Invitation entity path, US5-AS7)', async () => {
      // Batch: 1 existing actor, suggestedLanguage 'nl' — verifies the
      // Invitation entity (DL-1) receives the suggested language.
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
      // that carries suggestedLanguage: 'nl' (Invitation entity path — DL-1).
      expect(roleSetService.createInvitationExistingActor).toHaveBeenCalledWith(
        expect.objectContaining({ suggestedLanguage: 'nl' })
      );
    });

    it('should pass suggestedLanguage nl to createPlatformInvitation for new email users (PlatformInvitation entity path, US5-AS7)', async () => {
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
      // (verifies the fan-out helper threads the field through — R-5 mitigation).
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

    it('should send null suggestedLanguage when omitted — invitation succeeds and no language is recorded (FR-015)', async () => {
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

    it('should reject suggestedLanguage de before any row is written (DL-8 compose-time guard)', async () => {
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

      // No invitation row must be written — the guard fires up front (DL-8)
      expect(
        roleSetService.createInvitationExistingActor
      ).not.toHaveBeenCalled();
      expect(roleSetService.createPlatformInvitation).not.toHaveBeenCalled();
    });
  });
});
