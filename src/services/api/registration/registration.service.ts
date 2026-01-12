import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from '@domain/community/user/user.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IUser } from '@domain/community/user/user.interface';
import { LogContext } from '@common/enums/logging.context';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { getEmailDomain } from '@common/utils';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { IInvitation } from '@domain/access/invitation/invitation.interface';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { CreateInvitationInput } from '@domain/access/invitation/dto/invitation.dto.create';
import { DeleteUserInput } from '@domain/community/user/dto/user.dto.delete';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { ApplicationService } from '@domain/access/application/application.service';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AccountService } from '@domain/space/account/account.service';
import { IOrganization } from '@domain/community/organization';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { RoleName } from '@common/enums/role.name';
import { OrganizationLookupService } from '@domain/community/organization-lookup/organization.lookup.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { RelationshipNotFoundException } from '@common/exceptions';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { AccountAuthorizationService } from '@domain/space/account/account.service.authorization';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NotificationInputPlatformUserRegistered } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.user.registered';

export class RegistrationService {
  constructor(
    private accountService: AccountService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private accountAuthorizationService: AccountAuthorizationService,
    private organizationLookupService: OrganizationLookupService,
    private organizationService: OrganizationService,
    private platformInvitationService: PlatformInvitationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private invitationService: InvitationService,
    private applicationService: ApplicationService,
    private roleSetService: RoleSetService,
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async registerNewUser(agentInfo: AgentInfo): Promise<IUser> {
    if (!agentInfo.emailVerified) {
      throw new UserNotVerifiedException(
        `User '${agentInfo.email}' not verified`,
        LogContext.COMMUNITY
      );
    }

    if (agentInfo.authenticationID) {
      this.logger.verbose?.(
        'Received Kratos authentication ID for registration flow',
        LogContext.AUTH
      );
    }
    // If a user has a valid session, and hence email / names etc set, then they can create a User profile
    const user = await this.userService.createUserFromAgentInfo(agentInfo);

    await this.assignUserToOrganizationByDomain(user);

    // Finalize registration: authorization + pending invitations
    await this.finalizeUserRegistration(user);

    return user;
  }

  /**
   * Finalizes user registration by applying authorization and processing pending invitations.
   * This should be called after user entity creation, regardless of the creation path.
   */
  public async finalizeUserRegistration(user: IUser): Promise<IUser> {
    // Grant essential credentials to the user
    const userWithCredentials =
      await this.userAuthorizationService.grantCredentialsAllUsersReceive(
        user.id
      );

    // Apply and save user authorization policy
    const userAuthorizations =
      await this.userAuthorizationService.applyAuthorizationPolicy(
        userWithCredentials.id
      );
    await this.authorizationPolicyService.saveAll(userAuthorizations);

    // Apply and save account authorization policy
    const userAccount = await this.userService.getAccount(userWithCredentials);
    const accountAuthorizations =
      await this.accountAuthorizationService.applyAuthorizationPolicy(
        userAccount
      );
    await this.authorizationPolicyService.saveAll(accountAuthorizations);

    // Process any pending invitations for this user
    await this.processPendingInvitations(userWithCredentials);

    // Send notification that user profile was created
    await this.sendUserCreatedNotification(userWithCredentials);

    this.logger.verbose?.(
      `Finalized registration for user: ${user.id}`,
      LogContext.AUTH
    );

    return userWithCredentials;
  }

  private async sendUserCreatedNotification(user: IUser): Promise<void> {
    const notificationInput: NotificationInputPlatformUserRegistered = {
      triggeredBy: user.id,
      userID: user.id,
    };
    await this.notificationPlatformAdapter.platformUserProfileCreated(
      notificationInput
    );
  }

  async assignUserToOrganizationByDomain(user: IUser): Promise<boolean> {
    const userEmailDomain = getEmailDomain(user.email);

    const org = await this.organizationLookupService.getOrganizationByDomain(
      userEmailDomain,
      {
        relations: {
          roleSet: true,
          verification: true,
        },
      }
    );

    if (!org) {
      this.logger.verbose?.(
        `Organization matching user's domain '${userEmailDomain}' not found.`,
        LogContext.COMMUNITY
      );
      return false;
    }

    const orgSettings = org.settings;

    const orgMatchDomain =
      orgSettings.membership.allowUsersMatchingDomainToJoin;
    if (!orgMatchDomain) {
      this.logger.verbose?.(
        `Organization '${org.id}' setting 'allowUsersMatchingDomainToJoin is disabled`,
        LogContext.COMMUNITY
      );
      return false;
    }

    if (!org.verification || !org.roleSet) {
      throw new RelationshipNotFoundException(
        `Unable to load roleSet of Verification for Organization for matching user domain ${org.id}`,
        LogContext.COMMUNITY
      );
    }
    if (
      org.verification.status !==
      OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION
    ) {
      this.logger.verbose?.(
        `Organization '${org.id}' not verified`,
        LogContext.COMMUNITY
      );
      return false;
    }

    await this.roleSetService.assignUserToRole(
      org.roleSet,
      RoleName.ASSOCIATE,
      user.id
    );

    this.logger.verbose?.(
      `User ${user.id} successfully added to Organization '${org.id}'`,
      LogContext.COMMUNITY
    );
    return true;
  }

  public async processPendingInvitations(user: IUser): Promise<IInvitation[]> {
    const platformInvitations =
      await this.platformInvitationService.findPlatformInvitationsForUser(
        user.email
      );

    const roleSetInvitations: IInvitation[] = [];
    for (const platformInvitation of platformInvitations) {
      const roleSet = platformInvitation.roleSet;
      if (!roleSet) {
        this.logger.error?.(
          `Platform invitation ${platformInvitation.id} has no role set`,
          LogContext.COMMUNITY
        );
        continue;
      }

      const invitationInput: CreateInvitationInput = {
        invitedContributorID: user.id,
        roleSetID: roleSet.id,
        createdBy: platformInvitation.createdBy,
        extraRoles: platformInvitation.roleSetExtraRoles,
        invitedToParent: platformInvitation.roleSetInvitedToParent,
      };
      let invitation =
        await this.roleSetService.createInvitationExistingContributor(
          invitationInput
        );
      invitation.invitedToParent = platformInvitation.roleSetInvitedToParent;

      invitation = await this.invitationService.save(invitation);
      const authorization =
        await this.invitationAuthorizationService.applyAuthorizationPolicy(
          invitation,
          roleSet.authorization
        );
      await this.authorizationPolicyService.save(authorization);

      roleSetInvitations.push(invitation);

      await this.platformInvitationService.recordProfileCreated(
        platformInvitation
      );
    }
    return roleSetInvitations;
  }

  async deleteUserWithPendingMemberships(
    deleteData: DeleteUserInput
  ): Promise<IUser> {
    const userID = deleteData.ID;

    const invitations =
      await this.invitationService.findInvitationsForContributor(userID);
    for (const invitation of invitations) {
      await this.invitationService.deleteInvitation({ ID: invitation.id });
    }

    const applications =
      await this.applicationService.findApplicationsForUser(userID);
    for (const application of applications) {
      await this.applicationService.deleteApplication({ ID: application.id });
    }

    let user = await this.userService.getUserOrFail(userID);
    const account = await this.userService.getAccount(user);

    user = await this.userService.deleteUser(deleteData);
    await this.accountService.deleteAccountOrFail(account);
    return user;
  }

  async deleteOrganizationWithPendingMemberships(
    deleteData: DeleteUserInput
  ): Promise<IOrganization> {
    const organizationID = deleteData.ID;

    const invitations =
      await this.invitationService.findInvitationsForContributor(
        organizationID
      );
    for (const invitation of invitations) {
      await this.invitationService.deleteInvitation({ ID: invitation.id });
    }

    let organization =
      await this.organizationLookupService.getOrganizationOrFail(
        organizationID
      );
    const account = await this.organizationService.getAccount(organization);

    organization =
      await this.organizationService.deleteOrganization(deleteData);
    await this.accountService.deleteAccountOrFail(account);
    organization.id = organizationID;
    return organization;
  }
}
