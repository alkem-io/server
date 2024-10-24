import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from '@domain/community/user/user.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { IUser } from '@domain/community/user/user.interface';
import { LogContext } from '@common/enums/logging.context';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { getEmailDomain } from '@common/utils';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { OrganizationPreferenceType } from '@common/enums/organization.preference.type';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { IInvitation } from '@domain/access/invitation/invitation.interface';
import { InvitationAuthorizationService } from '@domain/access/invitation/invitation.service.authorization';
import { CreateInvitationInput } from '@domain/access/invitation/dto/invitation.dto.create';
import { DeleteUserInput } from '@domain/community/user/dto/user.dto.delete';
import { InvitationService } from '@domain/access/invitation/invitation.service';
import { ApplicationService } from '@domain/access/application/application.service';
import { OrganizationRole } from '@common/enums/organization.role';
import { PlatformInvitationService } from '@platform/invitation/platform.invitation.service';
import { PlatformRoleService } from '@platform/platfrom.role/platform.role.service';
import { OrganizationRoleService } from '@domain/community/organization-role/organization.role.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AccountService } from '@domain/space/account/account.service';
import { IOrganization } from '@domain/community/organization';
import { RoleSetService } from '@domain/access/role-set/role.set.service';

export class RegistrationService {
  constructor(
    private accountService: AccountService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private organizationRoleService: OrganizationRoleService,
    private preferenceSetService: PreferenceSetService,
    private platformInvitationService: PlatformInvitationService,
    private platformRoleService: PlatformRoleService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private invitationService: InvitationService,
    private applicationService: ApplicationService,
    private roleSetService: RoleSetService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async registerNewUser(agentInfo: AgentInfo): Promise<IUser> {
    if (!agentInfo.emailVerified) {
      throw new UserNotVerifiedException(
        `User '${agentInfo.email}' not verified`,
        LogContext.COMMUNITY
      );
    }
    // If a user has a valid session, and hence email / names etc set, then they can create a User profile
    const user = await this.userService.createUserFromAgentInfo(agentInfo);

    await this.assignUserToOrganizationByDomain(user);
    return user;
  }

  async assignUserToOrganizationByDomain(user: IUser): Promise<boolean> {
    const userEmailDomain = getEmailDomain(user.email);

    const org =
      await this.organizationService.getOrganizationByDomain(userEmailDomain);

    if (!org) {
      this.logger.verbose?.(
        `Organization matching user's domain '${userEmailDomain}' not found.`,
        LogContext.COMMUNITY
      );
      return false;
    }

    const preferences = await this.organizationService.getPreferenceSetOrFail(
      org.id
    );
    const orgMatchDomain =
      this.preferenceSetService.getPreferenceOrFail(
        preferences,
        OrganizationPreferenceType.AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN
      ).value === 'true';
    if (!orgMatchDomain) {
      this.logger.verbose?.(
        `Organization '${org.id}' preference ${OrganizationPreferenceType.AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN} is disabled`,
        LogContext.COMMUNITY
      );
      return false;
    }

    const verification = await this.organizationService.getVerification(org);
    if (
      verification.status !==
      OrganizationVerificationEnum.VERIFIED_MANUAL_ATTESTATION
    ) {
      this.logger.verbose?.(
        `Organization '${org.id}' not verified`,
        LogContext.COMMUNITY
      );
      return false;
    }

    await this.organizationRoleService.assignOrganizationRoleToUser({
      organizationID: org.id,
      userID: user.id,
      role: OrganizationRole.ASSOCIATE,
    });

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

    const communityInvitations: IInvitation[] = [];
    for (const platformInvitation of platformInvitations) {
      const roleSet = platformInvitation.roleSet;

      // Process community invitations
      if (roleSet) {
        const invitationInput: CreateInvitationInput = {
          invitedContributorID: user.id,
          roleSetID: roleSet.id,
          createdBy: platformInvitation.createdBy,
          extraRole: platformInvitation.roleSetExtraRole,
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

        communityInvitations.push(invitation);
      }

      // Proces platform role invitations
      if (platformInvitation.platformRole) {
        const membershipData = {
          userID: user.id,
          role: platformInvitation.platformRole,
        };
        await this.platformRoleService.assignPlatformRoleToUser(membershipData);
      }
      await this.platformInvitationService.recordProfileCreated(
        platformInvitation
      );
    }
    return communityInvitations;
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
    await this.accountService.deleteAccount(account);
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
      await this.organizationService.getOrganizationOrFail(organizationID);
    const account = await this.organizationService.getAccount(organization);

    organization =
      await this.organizationService.deleteOrganization(deleteData);
    await this.accountService.deleteAccount(account);
    organization.id = organizationID;
    return organization;
  }
}
