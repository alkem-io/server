import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { RelationshipNotFoundException } from '@common/exceptions';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { ApplicationService } from '@domain/access/application/application.service';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { AccountService } from '@domain/space/account/account.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { MockCacheManager } from '@test/mocks/cache-manager.mock';
import { MockWinstonProvider } from '@test/mocks/winston.provider.mock';
import { defaultMockerFactory } from '@test/utils/default.mocker.factory';
import { type Mock } from 'vitest';
import { RegistrationService } from './registration.service';

describe('RegistrationService', () => {
  let service: RegistrationService;
  let userService: {
    createUser: Mock;
    getUserByIdOrFail: Mock;
    getAccount: Mock;
    deleteUser: Mock;
    updateUserSettings: Mock;
  };
  let userAuthorizationService: {
    grantCredentialsAllUsersReceive: Mock;
    applyAuthorizationPolicy: Mock;
  };
  let accountAuthorizationService: { applyAuthorizationPolicy: Mock };
  let authorizationPolicyService: { saveAll: Mock; save: Mock };
  let organizationLookupService: {
    getOrganizationByDomain: Mock;
    getOrganizationOrFail: Mock;
  };
  let roleSetService: {
    assignActorToRole: Mock;
    createInvitationExistingActor: Mock;
  };
  let platformInvitationService: {
    findPlatformInvitationsForUser: Mock;
    recordProfileCreated: Mock;
  };
  let invitationService: {
    save: Mock;
    findInvitationsForActor: Mock;
    deleteInvitation: Mock;
  };
  let invitationAuthorizationService: { applyAuthorizationPolicy: Mock };
  let applicationService: {
    findApplicationsForUser: Mock;
    deleteApplication: Mock;
  };
  let accountService: { deleteAccountOrFail: Mock };
  let _organizationService: { getAccount: Mock; deleteOrganization: Mock };
  let notificationPlatformAdapter: { platformUserProfileCreated: Mock };
  let configService: { get: Mock };

  beforeEach(async () => {
    vi.restoreAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RegistrationService, MockCacheManager, MockWinstonProvider],
    })
      .useMocker(defaultMockerFactory)
      .compile();

    service = module.get(RegistrationService);
    userService = module.get(UserService) as any;
    userAuthorizationService = module.get(UserAuthorizationService) as any;
    accountAuthorizationService = module.get(
      AccountAuthorizationService
    ) as any;
    authorizationPolicyService = module.get(AuthorizationPolicyService) as any;
    organizationLookupService = module.get(OrganizationLookupService) as any;
    roleSetService = module.get(RoleSetService) as any;
    platformInvitationService = module.get(PlatformInvitationService) as any;
    invitationService = module.get(InvitationService) as any;
    invitationAuthorizationService = module.get(
      InvitationAuthorizationService
    ) as any;
    applicationService = module.get(ApplicationService) as any;
    accountService = module.get(AccountService) as any;
    _organizationService = module.get(OrganizationService) as any;
    notificationPlatformAdapter = module.get(
      NotificationPlatformAdapter
    ) as any;
    configService = module.get(ConfigService) as any;
    // Default: eligible = 'nl' (single eligible language).
    configService.get.mockImplementation((key: string) => {
      if (key === 'language') return { eligible: 'nl', default: 'en' };
      return undefined;
    });
  });

  describe('registerNewUser', () => {
    it('should throw UserNotVerifiedException when email is not verified', async () => {
      const kratosData = {
        email: 'test@example.com',
        emailVerified: false,
        authenticationID: 'auth-1',
        firstName: '',
        lastName: '',
        avatarURL: '',
      };

      await expect(service.registerNewUser(kratosData)).rejects.toThrow(
        UserNotVerifiedException
      );
    });

    it('should create user and finalize registration for new user', async () => {
      const newUser = { id: 'user-2', email: 'test@company.com' };
      const kratosData = {
        email: 'test@company.com',
        emailVerified: true,
        authenticationID: 'auth-1',
        firstName: 'Test',
        lastName: 'User',
        avatarURL: '',
      };
      const finalizedUser = { id: 'user-2', email: 'test@company.com' };

      userService.createUser.mockResolvedValue(newUser);
      // Mock org lookup to return no org (so assignUserToOrganizationByDomain returns false)
      organizationLookupService.getOrganizationByDomain.mockResolvedValue(
        undefined
      );
      // Mock finalization chain
      userAuthorizationService.grantCredentialsAllUsersReceive.mockResolvedValue(
        finalizedUser
      );
      userAuthorizationService.applyAuthorizationPolicy.mockResolvedValue([]);
      authorizationPolicyService.saveAll.mockResolvedValue(undefined);
      userService.getAccount.mockResolvedValue({ id: 'account-1' });
      accountAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        []
      );
      platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue(
        []
      );
      notificationPlatformAdapter.platformUserProfileCreated.mockResolvedValue(
        undefined
      );

      const result = await service.registerNewUser(kratosData);

      expect(result).toBe(finalizedUser);
      expect(
        userAuthorizationService.grantCredentialsAllUsersReceive
      ).toHaveBeenCalledWith('user-2');
    });
  });

  describe('assignUserToOrganizationByDomain', () => {
    const user = { id: 'user-1', email: 'test@company.com' } as any;

    it('should return false when no organization matches the email domain', async () => {
      organizationLookupService.getOrganizationByDomain.mockResolvedValue(
        undefined
      );

      const result = await service.assignUserToOrganizationByDomain(user);

      expect(result).toBe(false);
    });

    it('should return false when organization disallows domain matching', async () => {
      organizationLookupService.getOrganizationByDomain.mockResolvedValue({
        id: 'org-1',
        settings: { membership: { allowUsersMatchingDomainToJoin: false } },
        verification: {
          status: OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION,
        },
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

      await expect(
        service.assignUserToOrganizationByDomain(user)
      ).rejects.toThrow(RelationshipNotFoundException);
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
        verification: {
          status: OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION,
        },
        roleSet,
      });
      roleSetService.assignActorToRole.mockResolvedValue(undefined);

      const result = await service.assignUserToOrganizationByDomain(user);

      expect(result).toBe(true);
      expect(roleSetService.assignActorToRole).toHaveBeenCalledWith(
        roleSet,
        expect.any(String),
        'user-1'
      );
    });
  });

  describe('processPendingInvitations', () => {
    // A fresh user (language=null, flag=false) — the default state post-migration.
    const user = {
      id: 'user-1',
      email: 'test@example.com',
      settings: { language: null, languageOfferAnswered: false },
    } as any;

    it('should return empty array when no platform invitations exist', async () => {
      platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue(
        []
      );

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
      platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue(
        [{ id: 'pi-1', roleSet: undefined }, invitationWithRoleSet]
      );
      const savedInvitation = { id: 'inv-1', invitedToParent: false };
      roleSetService.createInvitationExistingActor.mockResolvedValue(
        savedInvitation
      );
      invitationService.save.mockResolvedValue(savedInvitation);
      invitationAuthorizationService.applyAuthorizationPolicy.mockResolvedValue(
        { id: 'auth-1' }
      );
      authorizationPolicyService.save.mockResolvedValue(undefined);
      platformInvitationService.recordProfileCreated.mockResolvedValue(
        undefined
      );

      const result = await service.processPendingInvitations(user);

      expect(result).toHaveLength(1);
      expect(
        roleSetService.createInvitationExistingActor
      ).toHaveBeenCalledTimes(1);
    });

    // T009 — registration-time language seeding (FR-016 / DL-7 / DL-8)
    describe('language seeding from platform invitations', () => {
      const freshUser = {
        id: 'user-seed',
        email: 'seed@example.com',
        settings: { language: null, languageOfferAnswered: false },
      } as any;

      beforeEach(() => {
        // Suppress the role-set and auth flow for these seeding-focused tests.
        platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue(
          []
        );
        userService.updateUserSettings = vi.fn().mockResolvedValue(freshUser);
      });

      it('should seed language from an nl invitation and latch the flag', async () => {
        platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue(
          [
            {
              id: 'pi-nl',
              roleSet: undefined, // no roleSet → skipped in loop, but seeding runs first
              createdBy: 'creator',
              roleSetExtraRoles: [],
              roleSetInvitedToParent: false,
              suggestedLanguage: 'nl',
              createdDate: new Date('2024-01-01'),
            },
          ]
        );

        await service.processPendingInvitations(freshUser);

        expect(userService.updateUserSettings).toHaveBeenCalledWith(freshUser, {
          language: 'nl',
        });
      });

      it('should skip an ineligible suggestion (de) and not seed', async () => {
        // eligible = 'nl' from the default configService mock; 'de' is not eligible.
        platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue(
          [
            {
              id: 'pi-de',
              roleSet: undefined,
              createdBy: 'creator',
              roleSetExtraRoles: [],
              roleSetInvitedToParent: false,
              suggestedLanguage: 'de',
              createdDate: new Date('2024-01-01'),
            },
          ]
        );

        await service.processPendingInvitations(freshUser);

        expect(userService.updateUserSettings).not.toHaveBeenCalled();
      });

      it('should pick the latest-created eligible invitation when multiple exist (DL-7)', async () => {
        // Two DISTINCT eligible languages: pi-old='en' (created earlier),
        // pi-new='nl' (created later).  With eligible='nl,en', both are
        // candidates.  The latest-created one (pi-new → 'nl') must win.
        // An ascending-sort implementation would incorrectly seed 'en' and
        // fail the assertion — this is what makes the test meaningful (R-6).
        configService.get.mockImplementation((key: string) => {
          if (key === 'language') return { eligible: 'nl,en', default: 'en' };
          return undefined;
        });
        platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue(
          [
            {
              id: 'pi-old',
              roleSet: undefined,
              createdBy: 'creator',
              roleSetExtraRoles: [],
              roleSetInvitedToParent: false,
              suggestedLanguage: 'en', // older, eligible — must NOT win
              createdDate: new Date('2024-01-01'),
            },
            {
              id: 'pi-new',
              roleSet: undefined,
              createdBy: 'creator',
              roleSetExtraRoles: [],
              roleSetInvitedToParent: false,
              suggestedLanguage: 'nl', // newer, eligible — must win
              createdDate: new Date('2024-06-01'),
            },
          ]
        );

        await service.processPendingInvitations(freshUser);

        // The latest-created eligible invitation (pi-new → 'nl') must be
        // selected and the call must happen exactly once.  If the sort were
        // ascending, 'en' (pi-old) would be seeded instead and this assertion
        // would fail — proving the sort direction is correct (DL-7).
        expect(userService.updateUserSettings).toHaveBeenCalledTimes(1);
        expect(userService.updateUserSettings).toHaveBeenCalledWith(freshUser, {
          language: 'nl',
        });
      });

      it('should not seed when settings are already set (language ≠ null)', async () => {
        const userWithLanguage = {
          id: 'user-set',
          email: 'set@example.com',
          settings: { language: 'en', languageOfferAnswered: true },
        } as any;
        platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue(
          [
            {
              id: 'pi-nl',
              roleSet: undefined,
              createdBy: 'creator',
              roleSetExtraRoles: [],
              roleSetInvitedToParent: false,
              suggestedLanguage: 'nl',
              createdDate: new Date('2024-01-01'),
            },
          ]
        );

        await service.processPendingInvitations(userWithLanguage);

        expect(userService.updateUserSettings).not.toHaveBeenCalled();
      });

      it('should not seed when no suggestedLanguage on any invitation', async () => {
        platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue(
          [
            {
              id: 'pi-no-lang',
              roleSet: undefined,
              createdBy: 'creator',
              roleSetExtraRoles: [],
              roleSetInvitedToParent: false,
              suggestedLanguage: undefined,
              createdDate: new Date('2024-01-01'),
            },
          ]
        );

        await service.processPendingInvitations(freshUser);

        expect(userService.updateUserSettings).not.toHaveBeenCalled();
      });

      // Regression test for corr-server-1 / spec-server-1 / qual-server-1:
      // The real production path has user.settings === undefined because
      // grantCredentialsAllUsersReceive fetches the user with no relations and
      // User.settings is eager:false.  The previous guard `!user.settings →
      // return` silently aborted seeding.  The fix reloads the user with
      // { relations: { settings: true } } when settings is absent.
      it('should reload settings and seed language when user.settings is not loaded (production path)', async () => {
        // Simulates what grantCredentialsAllUsersReceive returns: user WITHOUT
        // the settings relation loaded (eager:false, no options passed).
        const userWithoutSettings = {
          id: 'user-seed-prod',
          email: 'prod@example.com',
          settings: undefined, // ← the real production state
        } as any;

        // The user object that getUserByIdOrFail returns when called with
        // { relations: { settings: true } } — a fresh account.
        const userWithSettings = {
          id: 'user-seed-prod',
          email: 'prod@example.com',
          settings: { language: null, languageOfferAnswered: false },
        } as any;

        userService.getUserByIdOrFail.mockResolvedValue(userWithSettings);
        userService.updateUserSettings = vi
          .fn()
          .mockResolvedValue(userWithSettings);

        platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue(
          [
            {
              id: 'pi-nl-prod',
              roleSet: undefined,
              createdBy: 'creator',
              roleSetExtraRoles: [],
              roleSetInvitedToParent: false,
              suggestedLanguage: 'nl',
              createdDate: new Date('2024-01-01'),
            },
          ]
        );

        await service.processPendingInvitations(userWithoutSettings);

        // getUserByIdOrFail must be called with settings relation to hydrate settings
        expect(userService.getUserByIdOrFail).toHaveBeenCalledWith(
          'user-seed-prod',
          { relations: { settings: true } }
        );
        // Language must be seeded on the reloaded (settings-bearing) user object
        expect(userService.updateUserSettings).toHaveBeenCalledWith(
          userWithSettings,
          { language: 'nl' }
        );
      });

      it('should not reload settings when user.settings is already loaded', async () => {
        // freshUser already has settings populated — no extra DB fetch needed.
        platformInvitationService.findPlatformInvitationsForUser.mockResolvedValue(
          [
            {
              id: 'pi-nl-preloaded',
              roleSet: undefined,
              createdBy: 'creator',
              roleSetExtraRoles: [],
              roleSetInvitedToParent: false,
              suggestedLanguage: 'nl',
              createdDate: new Date('2024-01-01'),
            },
          ]
        );

        await service.processPendingInvitations(freshUser);

        // No reload when settings are already on the object
        expect(userService.getUserByIdOrFail).not.toHaveBeenCalled();
        expect(userService.updateUserSettings).toHaveBeenCalledWith(freshUser, {
          language: 'nl',
        });
      });
    });
  });

  describe('deleteUserWithPendingMemberships', () => {
    it('should delete invitations, applications, user and account', async () => {
      const deleteData = { ID: 'user-1' };
      invitationService.findInvitationsForActor.mockResolvedValue([
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
      userService.getUserByIdOrFail.mockResolvedValue(user);
      userService.getAccount.mockResolvedValue(account);
      userService.deleteUser.mockResolvedValue(user);
      accountService.deleteAccountOrFail.mockResolvedValue(undefined);

      const result = await service.deleteUserWithPendingMemberships(
        deleteData as any
      );

      expect(invitationService.deleteInvitation).toHaveBeenCalledTimes(2);
      expect(applicationService.deleteApplication).toHaveBeenCalledTimes(1);
      expect(userService.deleteUser).toHaveBeenCalledWith(deleteData);
      expect(accountService.deleteAccountOrFail).toHaveBeenCalledWith(account);
      expect(result).toBe(user);
    });
  });
});
