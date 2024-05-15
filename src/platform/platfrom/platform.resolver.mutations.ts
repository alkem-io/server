import { UseGuards } from '@nestjs/common';
import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { IPlatform } from './platform.interface';
import { PlatformAuthorizationService } from './platform.service.authorization';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { RoleChangeType } from '@alkemio/notifications-lib';
import { RemovePlatformRoleFromUserInput } from '@platform/platfrom/dto/platform.dto.remove.role.user';
import { IUser } from '@domain/community/user/user.interface';
import { NotificationInputPlatformGlobalRoleChange } from '@services/adapters/notification-adapter/dto/notification.dto.input.platform.global.role.change';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { PlatformService } from './platform.service';
import { AssignPlatformRoleToUserInput } from './dto/platform.dto.assign.role.user';
import { PlatformRole } from '@common/enums/platform.role';

@Resolver()
export class PlatformResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private platformService: PlatformService,
    private platformAuthorizationService: PlatformAuthorizationService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPlatform, {
    description: 'Reset the Authorization Policy on the specified Platform.',
  })
  @Profiling.api
  async authorizationPolicyResetOnPlatform(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IPlatform> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN, // TODO: back to authorization reset
      `reset authorization on platform: ${agentInfo.email}`
    );
    return await this.platformAuthorizationService.applyAuthorizationPolicy();
  }

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
    if (membershipData.role === PlatformRole.BETA_TESTER) {
      privilegeRequired = AuthorizationPrivilege.PLATFORM_ADMIN;
    }
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      privilegeRequired,
      `assign user platform role admin: ${membershipData.userID} - ${membershipData.role}`
    );
    const user = await this.platformService.assignPlatformRoleToUser(
      membershipData
    );

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
    const user = await this.platformService.removePlatformRoleFromUser(
      membershipData
    );
    this.notifyPlatformGlobalRoleChange(
      agentInfo.userID,
      user,
      RoleChangeType.REMOVED,
      membershipData.role
    );
    return user;
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
