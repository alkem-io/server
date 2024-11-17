import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { RoleChangeType } from '@alkemio/notifications-lib';
import { RemovePlatformRoleFromUserInput } from '@platform/platform/dto/platform.dto.remove.role.user';
import { IUser } from '@domain/community/user/user.interface';
import { NotificationInputPlatformGlobalRoleChange } from '@services/adapters/notification-adapter/dto/notification.dto.input.platform.global.role.change';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { AssignPlatformRoleToUserInput } from './dto/platform.dto.assign.role.user';
import { PlatformRole } from '@common/enums/platform.role';
import { CreatePlatformInvitationForRoleInput } from '@platform/platform/dto/platform.invitation.dto.global.role';
import { IPlatformInvitation } from '@platform/invitation/platform.invitation.interface';
import { PlatformRoleService } from './platform.role.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AccountService } from '@domain/space/account/account.service';
import { AccountLicenseService } from '@domain/space/account/account.service.license';
import { LicenseService } from '@domain/common/license/license.service';

@Resolver()
export class PlatformRoleResolverMutations {
  constructor(
    private accountService: AccountService,
    private accountLicenseService: AccountLicenseService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private notificationAdapter: NotificationAdapter,
    private platformRoleService: PlatformRoleService,
    private licenseService: LicenseService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a platform role to a User.',
  })
  async assignPlatformRoleToUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignPlatformRoleToUserInput
  ): Promise<IUser> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    let privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;
    if (
      membershipData.role === PlatformRole.BETA_TESTER ||
      membershipData.role === PlatformRole.VC_CAMPAIGN
    ) {
      privilegeRequired = AuthorizationPrivilege.PLATFORM_ADMIN;
    }
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      privilegeRequired,
      `assign user platform role admin: ${membershipData.userID} - ${membershipData.role}`
    );
    const user =
      await this.platformRoleService.assignPlatformRoleToUser(membershipData);

    if (
      membershipData.role === PlatformRole.BETA_TESTER ||
      membershipData.role === PlatformRole.VC_CAMPAIGN
    ) {
      await this.resetLicenseForUserAccount(user);
    }

    this.notifyPlatformGlobalRoleChange(
      agentInfo.userID,
      user,
      RoleChangeType.ADDED,
      membershipData.role
    );
    return user;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from a platform role.',
  })
  @Profiling.api
  async removePlatformRoleFromUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemovePlatformRoleFromUserInput
  ): Promise<IUser> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    let privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;
    if (membershipData.role === PlatformRole.BETA_TESTER) {
      privilegeRequired = AuthorizationPrivilege.PLATFORM_ADMIN;
    }
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      privilegeRequired,
      `remove user platform role: ${membershipData.userID} - ${membershipData.role}`
    );
    const user =
      await this.platformRoleService.removePlatformRoleFromUser(membershipData);

    if (
      membershipData.role === PlatformRole.BETA_TESTER ||
      membershipData.role === PlatformRole.VC_CAMPAIGN
    ) {
      await this.resetLicenseForUserAccount(user);
    }

    this.notifyPlatformGlobalRoleChange(
      agentInfo.userID,
      user,
      RoleChangeType.REMOVED,
      membershipData.role
    );
    return user;
  }

  private async resetLicenseForUserAccount(user: IUser) {
    const account = await this.accountService.getAccountOrFail(user.accountID);
    const licenses = await this.accountLicenseService.applyLicensePolicy(
      account.id
    );
    await this.licenseService.saveAll(licenses);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPlatformInvitation, {
    description:
      'Invite a User to join the platform in a particular Platform role e.g. BetaTester',
  })
  async inviteUserToPlatformWithRole(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: CreatePlatformInvitationForRoleInput
  ): Promise<IPlatformInvitation> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `invitation to platform in global role: ${invitationData.email}`
    );

    // TODO: Notification

    return await this.platformRoleService.createPlatformInvitation(
      invitationData,
      agentInfo
    );
  }

  private async notifyPlatformGlobalRoleChange(
    triggeredBy: string,
    user: IUser,
    type: RoleChangeType,
    role: string
  ) {
    const notificationInput: NotificationInputPlatformGlobalRoleChange = {
      triggeredBy,
      userID: user.id,
      type: type,
      role: role,
    };
    await this.notificationAdapter.platformGlobalRoleChanged(notificationInput);
  }
}
