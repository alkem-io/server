import { Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { UserService } from '@domain/community/user/user.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { AgentInfo } from '@core/authentication/agent-info';
import { IUser } from '@domain/community/user/user.interface';
import { LogContext } from '@common/enums/logging.context';
import { UserNotVerifiedException } from '@common/exceptions/user/user.not.verified.exception';
import { getEmailDomain } from '@common/utils';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { OrganizationPreferenceType } from '@common/enums/organization.preference.type';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';

export class RegistrationService {
  constructor(
    private userService: UserService,
    private organizationService: OrganizationService,
    private preferenceSetService: PreferenceSetService,
    private userAuthorizationService: UserAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async registerNewUser(agentInfo: AgentInfo): Promise<IUser> {
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
    if (!agentInfo.emailVerified) {
      throw new UserNotVerifiedException(
        `User '${user.nameID}' not verified`,
        LogContext.COMMUNITY
      );
    }

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

    await this.organizationService.assignMember({
      organizationID: org.id,
      userID: user.id,
    });

    this.logger.verbose?.(
      `User ${user.nameID} successfully added to Organization '${org.nameID}'`,
      LogContext.COMMUNITY
    );
    return true;
  }
}
