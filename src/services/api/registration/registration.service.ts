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
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { IInvitation } from '@domain/community/invitation/invitation.interface';
import { InvitationExternalService } from '@domain/community/invitation.external/invitation.external.service';
import { CommunityService } from '@domain/community/community/community.service';
import { InvitationAuthorizationService } from '@domain/community/invitation/invitation.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions/relationship.not.found.exception';
import { CreateInvitationInput } from '@domain/community/invitation/dto/invitation.dto.create';
import { DeleteUserInput } from '@domain/community/user/dto/user.dto.delete';
import { InvitationService } from '@domain/community/invitation/invitation.service';
import { ApplicationService } from '@domain/community/application/application.service';
import { OrganizationRole } from '@common/enums/organization.role';

export class RegistrationService {
  constructor(
    private userService: UserService,
    private organizationService: OrganizationService,
    private preferenceSetService: PreferenceSetService,
    private userAuthorizationService: UserAuthorizationService,
    private communityService: CommunityService,
    private invitationExternalService: InvitationExternalService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private invitationService: InvitationService,
    private applicationService: ApplicationService,
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
    let user = await this.userService.createUserFromAgentInfo(agentInfo);
    user = await this.userAuthorizationService.grantCredentials(user);

    await this.assignUserToOrganizationByDomain(agentInfo, user);
    return user;
  }

  async assignUserToOrganizationByDomain(
    agentInfo: AgentInfo,
    user: IUser
  ): Promise<boolean> {
    const userEmailDomain = getEmailDomain(user.email);

    const org = await this.organizationService.getOrganizationByDomain(
      userEmailDomain
    );

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
        `Organization '${org.nameID}' preference ${OrganizationPreferenceType.AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN} is disabled`,
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
        `Organization '${org.nameID}' not verified`,
        LogContext.COMMUNITY
      );
      return false;
    }

    await this.organizationService.assignOrganizationRoleToUser({
      organizationID: org.id,
      userID: user.id,
      role: OrganizationRole.ASSOCIATE,
    });

    this.logger.verbose?.(
      `User ${user.nameID} successfully added to Organization '${org.nameID}'`,
      LogContext.COMMUNITY
    );
    return true;
  }

  public async processPendingInvitations(user: IUser): Promise<IInvitation[]> {
    const externalInvitations =
      await this.invitationExternalService.findInvitationExternalsForUser(
        user.email
      );

    const invitations: IInvitation[] = [];
    for (const externalInvitation of externalInvitations) {
      const community = externalInvitation.community;
      if (!community) {
        throw new RelationshipNotFoundException(
          `Unable to load Community that created invitationExternal ${externalInvitation.id} `,
          LogContext.COMMUNITY
        );
      }
      const invitationInput: CreateInvitationInput = {
        invitedUser: user.id,
        communityID: community.id,
        createdBy: externalInvitation.createdBy,
      };
      const invitation =
        await this.communityService.createInvitationExistingUser(
          invitationInput
        );
      await this.invitationAuthorizationService.applyAuthorizationPolicy(
        invitation,
        community.authorization
      );
      invitations.push(invitation);
      await this.invitationExternalService.recordProfileCreated(
        externalInvitation
      );
    }
    return invitations;
  }

  async deleteUserWithPendingMemberships(
    deleteData: DeleteUserInput
  ): Promise<IUser> {
    const userID = deleteData.ID;

    const invitations = await this.invitationService.findInvitationsForUser(
      userID
    );
    for (const invitation of invitations) {
      await this.invitationService.deleteInvitation({ ID: invitation.id });
    }

    const applications = await this.applicationService.findApplicationsForUser(
      userID
    );
    for (const application of applications) {
      await this.applicationService.deleteApplication({ ID: application.id });
    }

    return await this.userService.deleteUser(deleteData);
  }
}
