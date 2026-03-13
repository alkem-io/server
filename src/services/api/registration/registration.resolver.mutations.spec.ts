import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { UserService } from '@domain/community/user/user.service';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { createMock } from '@golevelup/ts-vitest';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { RegistrationResolverMutations } from './registration.resolver.mutations';
import { RegistrationService } from './registration.service';

const actorContext = { actorID: 'user-1' } as any;

describe('RegistrationResolverMutations', () => {
  let resolver: RegistrationResolverMutations;
  let registrationService: ReturnType<typeof createMock<RegistrationService>>;
  let userService: ReturnType<typeof createMock<UserService>>;
  let orgService: ReturnType<typeof createMock<OrganizationService>>;
  let authService: ReturnType<typeof createMock<AuthorizationService>>;
  let platformAuthService: ReturnType<
    typeof createMock<PlatformAuthorizationPolicyService>
  >;
  let notificationAdapter: ReturnType<
    typeof createMock<NotificationPlatformAdapter>
  >;

  beforeEach(() => {
    notificationAdapter = createMock<NotificationPlatformAdapter>();
    registrationService = createMock<RegistrationService>();
    userService = createMock<UserService>();
    orgService = createMock<OrganizationService>();
    const orgAuthService = createMock<OrganizationAuthorizationService>();
    authService = createMock<AuthorizationService>();
    platformAuthService = createMock<PlatformAuthorizationPolicyService>();
    const accountAuthService = createMock<AccountAuthorizationService>();
    const authPolicyService = createMock<AuthorizationPolicyService>();
    const logger = { verbose: vi.fn(), warn: vi.fn(), error: vi.fn() };

    platformAuthService.getPlatformAuthorizationPolicy.mockResolvedValue(
      {} as any
    );
    userService.createUser.mockResolvedValue({ id: 'new-user' } as any);
    userService.getUserByIdOrFail.mockResolvedValue({
      id: 'new-user',
      authorization: { id: 'auth-1' },
      profile: { displayName: 'Test' },
    } as any);
    registrationService.finalizeUserRegistration.mockResolvedValue(
      undefined as any
    );
    registrationService.deleteUserWithPendingMemberships.mockResolvedValue({
      id: 'deleted-user',
    } as any);
    registrationService.deleteOrganizationWithPendingMemberships.mockResolvedValue(
      { id: 'deleted-org' } as any
    );
    orgService.createOrganization.mockResolvedValue({
      id: 'new-org',
    } as any);
    orgService.getOrganizationOrFail.mockResolvedValue({
      id: 'new-org',
      authorization: { id: 'auth-org' },
    } as any);
    orgService.getAccount.mockResolvedValue({ id: 'account-1' } as any);
    orgAuthService.applyAuthorizationPolicy.mockResolvedValue([]);
    accountAuthService.applyAuthorizationPolicy.mockResolvedValue([]);

    resolver = new RegistrationResolverMutations(
      notificationAdapter,
      registrationService,
      userService,
      orgService,
      orgAuthService,
      authService,
      platformAuthService,
      accountAuthService,
      authPolicyService,
      logger as any
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('should create a user with authorization check', async () => {
    const userData = { nameID: 'test-user', email: 'test@test.com' } as any;
    const result = await resolver.createUser(actorContext, userData);

    expect(result).toBeDefined();
    expect(authService.grantAccessOrFail).toHaveBeenCalled();
    expect(userService.createUser).toHaveBeenCalledWith(userData);
    expect(registrationService.finalizeUserRegistration).toHaveBeenCalled();
  });

  it('should create an organization with authorization check', async () => {
    const orgData = { nameID: 'test-org' } as any;
    const result = await resolver.createOrganization(actorContext, orgData);

    expect(result).toBeDefined();
    expect(authService.grantAccessOrFail).toHaveBeenCalled();
    expect(orgService.createOrganization).toHaveBeenCalledWith(
      orgData,
      actorContext
    );
  });

  it('should delete a user with notification', async () => {
    const deleteData = { ID: 'user-to-delete' };
    const result = await resolver.deleteUser(actorContext, deleteData);

    expect(result).toBeDefined();
    expect(result.id).toBe('deleted-user');
    expect(authService.grantAccessOrFail).toHaveBeenCalled();
    expect(
      registrationService.deleteUserWithPendingMemberships
    ).toHaveBeenCalledWith(deleteData);
    expect(notificationAdapter.platformUserRemoved).toHaveBeenCalled();
  });

  it('should delete an organization with authorization check', async () => {
    const deleteData = { ID: 'org-to-delete' };
    const result = await resolver.deleteOrganization(actorContext, deleteData);

    expect(result).toBeDefined();
    expect(result.id).toBe('deleted-org');
    expect(authService.grantAccessOrFail).toHaveBeenCalled();
    expect(
      registrationService.deleteOrganizationWithPendingMemberships
    ).toHaveBeenCalledWith(deleteData);
  });
});
