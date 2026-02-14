import { Test, TestingModule } from '@nestjs/testing';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { vi, type Mock } from 'vitest';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { RelationshipNotFoundException } from '@common/exceptions';
import { RegistrationService } from './registration.service';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { ApplicationService } from '@domain/access/application/application.service';
import { AccountService } from '@domain/space/account/account.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let userService: { createOrLinkUserFromAgentInfo: Mock; getUserOrFail: Mock; getAccount: Mock; deleteUser: Mock };
  let userAuthorizationService: { grantCredentialsAllUsersReceive: Mock; applyAuthorizationPolicy: Mock };
  let accountAuthorizationService: { applyAuthorizationPolicy: Mock };
  let authorizationPolicyService: { saveAll: Mock; save: Mock };
  let organizationLookupService: { getOrganizationByDomain: Mock; getOrganizationOrFail: Mock };
  let roleSetService: { assignUserToRole: Mock; createInvitationExistingContributor: Mock };
  let platformInvitationService: { findPlatformInvitationsForUser: Mock; recordProfileCreated: Mock };
  let invitationService: { save: Mock; findInvitationsForContributor: Mock; deleteInvitation: Mock };
  let invitationAuthorizationService: { applyAuthorizationPolicy: Mock };
  let applicationService: { findApplicationsForUser: Mock; deleteApplication: Mock };
  let accountService: { deleteAccountOrFail: Mock };
  let organizationService: { getAccount: Mock; deleteOrganization: Mock };
  let notificationPlatformAdapter: { platformUserProfileCreated: Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        MockCacheManager,
        MockWinstonProvider,
      ],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RegistrationService);
    userService = module.get(UserService) as any;
    userAuthorizationService = module.get(UserAuthorizationService) as any;
    accountAuthorizationService = module.get(AccountAuthorizationService) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    organizationLookupService = module.get(OrganizationLookupService) as any;
    roleSetService = module.get(RoleSetService) as any;
    platformInvitationService = module.get(PlatformInvitationService) as any;
    invitationService = module.get(InvitationService) as any;
    invitationAuthorizationService = module.get(InvitationAuthorizationService) as any;
    applicationService = module.get(ApplicationService) as any;
    accountService = module.get(AccountService) as any;
    organizationService = module.get(OrganizationService) as any;
    notificationPlatformAdapter = module.get(NotificationPlatformAdapter) as any;
  });

  describe('registerNewUser', () => {
    it('should throw UserNotVerifiedException when email is not verified', async () => {
      const agentInfo = { email: 'test@example.com', emailVerified: false } as any;

      await expect(service.registerNewUser(agentInfo)).rejects.toThrow(
        UserNotVerifiedException
      );
    });

    it('should return existing user without finalization when user is linked (not new)', async () => {
      const existingUser = { id: 'user-1', email: 'test@example.com' };
      const agentInfo = { email: 'test@example.com', emailVerified: true } as any;

      userService.createOrLinkUserFromAgentInfo.mockResolvedValue({
        user: existingUser,
        isNew: false,
      });

      const result = await service.registerNewUser(agentInfo);

      expect(result).toBe(existingUser);
      expect(userAuthorizationService.grantCredentialsAllUsersReceive).not.toHaveBeenCalled();
    });

    it('should finalize registration and assign org for new user', async () => {
      const newUser = { id: 'user-2', email: 'test@company.com' };
      const agentInfo = { email: 'test@company.com', emailVerified: true } as any;
      const finalizedUser = { id: 'user-2', email: 'test@company.com' };

      userService.createOrLinkUserFromAgentInfo.mockResolvedValue({
        user: newUser,
        isNew: true,
      });
      // Mock org lookup to return no org (so assignUserToOrganizationByDomain returns false)
      organizationLookupService.getOrganizationByDomain.mockResolvedValue(undefined);
      // Mock finalization chain
      userAuthorizationService.grantCredentialsAllUsersReceive.mockResolvedValue(finalizedUser);
      userAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      userService.getAccount.mockResolvedValue({ id: 'account-1' });
      accountAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue([]);
      notificationPlatformAdapter.platformUserProfileCreated.mockResolvedValue(undefined);

      const result = await service.registerNewUser(agentInfo);

      expect(result).toBe(finalizedUser);
      expect(userAuthorizationService.grantCredentialsAllUsersReceive).toHaveBeenCalledWith('user-2');
    });
  });

  describe('assignUserToOrganizationByDomain', () => {
    const user = { id: 'user-1', email: 'test@company.com' } as any;

    it('should return false when no organization matches the email domain', async () => {
      organizationLookupService.getOrganizationByDomain.mockResolvedValue(undefined);

      const result = await service.assignUserToOrganizationByDomain(user);

      expect(result).toBe(false);
    });

    it('should return false when organization disallows domain matching', async () => {
      organizationLookupService.getOrganizationByDomain.mockResolvedValue({
        id: 'org-1',
        settings: { membership: { allowUsersMatchingDomainToJoin: false } },
        verification: { status: OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION },
        roleSet: { id: 'rs-1' },
      });

      const result = await service.assignUserToOrganizationByDomain(user);

      expect(result).toBe(false);
    });

    it('should throw RelationshipNotFoundException when verification or roleSet is missing', async () => {
      organizationLookupService.getOrganizationByDomain.mockResolvedValue({
        id: 'org-1',
        settings: { membership: { allowUsersMatchingDomainToJoin: true } },
        verification: undefined,
        roleSet: undefined,
      });

      await expect(service.assignUserToOrganizationByDomain(user)).rejects.toThrow(
        RelationshipNotFoundException
      );
    });

    it('should return false when organization is not verified', async () => {
      organizationLookupService.getOrganizationByDomain.mockResolvedValue({
        id: 'org-1',
        settings: { membership: { allowUsersMatchingDomainToJoin: true } },
        verification: { status: OrganizationVerificationEnum.NOT_VERIFIED },
        roleSet: { id: 'rs-1' },
      });

      const result = await service.assignUserToOrganizationByDomain(user);

      expect(result).toBe(false);
    });

    it('should assign user to role and return true when all conditions are met', async () => {
      const roleSet = { id: 'rs-1' };
      organizationLookupService.getOrganizationByDomain.mockResolvedValue({
        id: 'org-1',
        settings: { membership: { allowUsersMatchingDomainToJoin: true } },
        verification: { status: OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION },
        roleSet,
      });
      roleSetService.assignUserToRole.mockResolvedValue(undefined);

      const result = await service.assignUserToOrganizationByDomain(user);

      expect(result).toBe(true);
      expect(roleSetService.assignUserToRole).toHaveBeenCalledWith(
        roleSet,
        expect.any(String),
        'user-1'
      );
    });
  });

  describe('processPendingInvitations', () => {
    const user = { id: 'user-1', email: 'test@example.com' } as any;

    it('should return empty array when no platform invitations exist', async () => {
      platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue([]);

      const result = await service.processPendingInvitations(user);

      expect(result).toEqual([]);
    });

    it('should skip invitations with no roleSet and continue processing others', async () => {
      const invitationWithRoleSet = {
        id: 'pi-2',
        roleSet: { id: 'rs-1', authorization: { id: 'auth-1' } },
        createdBy: 'creator-1',
        roleSetExtraRoles: [],
        roleSetInvitedToParent: false,
      };
      platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue([
        { id: 'pi-1', roleSet: undefined },
        invitationWithRoleSet,
      ]);
      const savedInvitation = { id: 'inv-1', invitedToParent: false };
      roleSetService.createInvitationExistingContributor.mockResolvedValue(savedInvitation);
      invitationService.save.mockResolvedValue(savedInvitation);
      invitationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue({ id: 'auth-1' });
      authorizationPolicyService.save.mockResolvedValue(undefined);
      platformInvitationService.recordProfileCreated.mockResolvedValue(undefined);

      const result = await service.processPendingInvitations(user);

      expect(result).toHaveLength(1);
      expect(roleSetService.createInvitationExistingContributor).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteUserWithPendingMemberships', () => {
    it('should delete invitations, applications, user and account', async () => {
      const deleteData = { ID: 'user-1' };
      invitationService.findInvitationsForContributor.mockResolvedValue([
        { id: 'inv-1' },
        { id: 'inv-2' },
      ]);
      invitationService.deleteInvitation.mockResolvedValue(undefined);
      applicationService.findApplicationsForUser.mockResolvedValue([
        { id: 'app-1' },
      ]);
      applicationService.deleteApplication.mockResolvedValue(undefined);
      const user = { id: 'user-1' };
      const account = { id: 'account-1' };
      userService.getUserOrFail.mockResolvedValue(user);
      userService.getAccount.mockResolvedValue(account);
      userService.deleteUser.mockResolvedValue(user);
      accountService.deleteAccountOrFail.mockResolvedValue(undefined);

      const result = await service.deleteUserWithPendingMemberships(deleteData as any);

      expect(invitationService.deleteInvitation).toHaveBeenCalledTimes(2);
      expect(applicationService.deleteApplication).toHaveBeenCalledTimes(1);
      expect(userService.deleteUser).toHaveBeenCalledWith(deleteData);
      expect(accountService.deleteAccountOrFail).toHaveBeenCalledWith(account);
      expect(result).toBe(user);
    });
  });
});
