import { ActorType } from '@common/enums/actor.type';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { InvitationAuthorizationService } from './invitation.service.authorization';

describe('InvitationAuthorizationService', () => {
  let service: InvitationAuthorizationService;
  let authorizationPolicyService: AuthorizationPolicyService;
  let actorLookupService: ActorLookupService;
  let virtualContributorLookupService: VirtualContributorLookupService;

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationAuthorizationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get<InvitationAuthorizationService>(
      InvitationAuthorizationService
    );
    authorizationPolicyService = module.get<AuthorizationPolicyService>(
      AuthorizationPolicyService
    );
    actorLookupService = module.get<ActorLookupService>(ActorLookupService);
    virtualContributorLookupService =
      module.get<VirtualContributorLookupService>(
        VirtualContributorLookupService
      );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyAuthorizationPolicy', () => {
    it('should handle user actor type', async () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        invitedActorID: 'actor-1',
        authorization: mockAuth,
      } as any;
      const mockUser = {
        id: 'actor-1',
        type: ActorType.USER,
        accountID: 'account-1',
      } as any;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mockAuth);
      (actorLookupService.getFullActorById as Mock).mockResolvedValue(mockUser);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule-1' }
      );
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(mockAuth);

      const result = await service.applyAuthorizationPolicy(
        mockInvitation,
        undefined
      );

      expect(result).toBe(mockAuth);
      expect(
        authorizationPolicyService.createCredentialRule
      ).toHaveBeenCalled();
    });

    it('should handle organization actor type', async () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        invitedActorID: 'org-1',
        authorization: mockAuth,
      } as any;
      const mockOrg = {
        id: 'org-1',
        type: ActorType.ORGANIZATION,
        accountID: 'account-2',
      } as any;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mockAuth);
      (actorLookupService.getFullActorById as Mock).mockResolvedValue(mockOrg);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule-1' }
      );
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(mockAuth);

      const result = await service.applyAuthorizationPolicy(
        mockInvitation,
        undefined
      );

      expect(result).toBe(mockAuth);
    });

    it('should handle virtual contributor actor type', async () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        invitedActorID: 'vc-1',
        authorization: mockAuth,
      } as any;
      const mockVC = {
        id: 'vc-1',
        type: ActorType.VIRTUAL_CONTRIBUTOR,
      } as any;
      const mockAccount = { id: 'account-3' } as any;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mockAuth);
      (actorLookupService.getFullActorById as Mock).mockResolvedValue(mockVC);
      (
        virtualContributorLookupService.getAccountOrFail as Mock
      ).mockResolvedValue(mockAccount);
      (authorizationPolicyService.createCredentialRule as Mock).mockReturnValue(
        { name: 'rule-1' }
      );
      (
        authorizationPolicyService.appendCredentialAuthorizationRules as Mock
      ).mockReturnValue(mockAuth);

      const result = await service.applyAuthorizationPolicy(
        mockInvitation,
        undefined
      );

      expect(result).toBe(mockAuth);
      expect(
        virtualContributorLookupService.getAccountOrFail
      ).toHaveBeenCalledWith('vc-1');
    });

    it('should throw when actor has no accountID', async () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        invitedActorID: 'actor-1',
        authorization: mockAuth,
      } as any;
      const mockActor = {
        id: 'actor-1',
        type: ActorType.USER,
        accountID: undefined,
      } as any;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mockAuth);
      (actorLookupService.getFullActorById as Mock).mockResolvedValue(
        mockActor
      );

      await expect(
        service.applyAuthorizationPolicy(mockInvitation, undefined)
      ).rejects.toThrow(RoleSetMembershipException);
    });

    it('should return authorization unchanged when actor does not exist (orphaned invitation)', async () => {
      const mockAuth = { id: 'auth-1' } as any;
      const mockInvitation = {
        id: 'inv-1',
        invitedActorID: 'missing-actor',
        authorization: mockAuth,
      } as any;

      (
        authorizationPolicyService.inheritParentAuthorization as Mock
      ).mockReturnValue(mockAuth);
      (actorLookupService.getFullActorById as Mock).mockResolvedValue(null);

      const result = await service.applyAuthorizationPolicy(
        mockInvitation,
        undefined
      );

      expect(result).toBe(mockAuth);
      expect(
        authorizationPolicyService.createCredentialRule
      ).not.toHaveBeenCalled();
    });
  });
});
