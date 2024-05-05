import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';

import { IUser } from '@domain/community/user';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AdminAuthorizationService } from './admin.authorization.service';
import { GrantAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant';
import { RevokeAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { GLOBAL_POLICY_AUTHORIZATION_GRANT_GLOBAL_ADMIN } from '@common/constants/authorization/global.policy.constants';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthResetService } from '@services/auth-reset/publisher/auth-reset.service';
import { IOrganization } from '@domain/community/organization';
import { GrantOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant.organization';
import { RevokeOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke.organization';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputPlatformGlobalRoleChange } from '@services/adapters/notification-adapter/dto/notification.dto.input.platform.global.role.change';
import { RoleChangeType } from '@alkemio/notifications-lib';
import { AssignPlatformRoleToUserInput } from './dto/authorization.dto.assign.platform.role.user';
import { RemovePlatformRoleFromUserInput } from './dto/authorization.dto.remove.platform.role.user';

@Resolver()
export class AdminAuthorizationResolverMutations {
  private authorizationGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private notificationAdapter: NotificationAdapter,
    private authorizationService: AuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private authResetService: AuthResetService
  ) {
    this.authorizationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.GRANT_GLOBAL_ADMINS],
        GLOBAL_POLICY_AUTHORIZATION_GRANT_GLOBAL_ADMIN
      );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Grants an authorization credential to a User.',
  })
  @Profiling.api
  async grantCredentialToUser(
    @Args('grantCredentialData')
    grantCredentialData: GrantAuthorizationCredentialInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `grant credential: ${agentInfo.email}`
    );

    const user = await this.adminAuthorizationService.grantCredentialToUser(
      grantCredentialData
    );

    // Send the notification
    this.notifyPlatformGlobalRoleChange(
      agentInfo.userID,
      user,
      RoleChangeType.ADDED,
      grantCredentialData.type
    );
    return user;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes an authorization credential from a User.',
  })
  @Profiling.api
  async revokeCredentialFromUser(
    @Args('revokeCredentialData')
    credentialRemoveData: RevokeAuthorizationCredentialInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `revoke credential: ${agentInfo.email}`
    );
    const user = await this.adminAuthorizationService.revokeCredentialFromUser(
      credentialRemoveData
    );
    this.notifyPlatformGlobalRoleChange(
      agentInfo.userID,
      user,
      RoleChangeType.REMOVED,
      credentialRemoveData.type
    );
    return user;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description: 'Grants an authorization credential to an Organization.',
  })
  @Profiling.api
  async grantCredentialToOrganization(
    @Args('grantCredentialData')
    grantCredentialData: GrantOrganizationAuthorizationCredentialInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IOrganization> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `grant credential: ${agentInfo.email}`
    );
    return await this.adminAuthorizationService.grantCredentialToOrganization(
      grantCredentialData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description: 'Removes an authorization credential from an Organization.',
  })
  @Profiling.api
  async revokeCredentialFromOrganization(
    @Args('revokeCredentialData')
    credentialRemoveData: RevokeOrganizationAuthorizationCredentialInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IOrganization> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `revoke credential: ${agentInfo.email}`
    );
    return await this.adminAuthorizationService.revokeCredentialFromOrganization(
      credentialRemoveData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a role to a User.',
  })
  @Profiling.api
  async assignPlatformRoleToUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignPlatformRoleToUserInput
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `assign user platform role admin: ${membershipData.userID} - ${membershipData.role}`
    );
    const user = await this.adminAuthorizationService.assignPlatformRoleToUser(
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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `remove user platform role: ${membershipData.userID} - ${membershipData.role}`
    );
    const user =
      await this.adminAuthorizationService.removePlatformRoleFromUser(
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

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description: 'Reset the Authorization Policy on all entities',
  })
  public async authorizationPolicyResetAll(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN, // todo: replace with AUTHORIZATION_RESET once that has been granted
      `reset authorization on platform: ${agentInfo.email}`
    );

    return this.authResetService.publishResetAll();
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAuthorizationPolicy, {
    description:
      'Reset the specified Authorization Policy to global admin privileges',
  })
  public async authorizationPolicyResetToGlobalAdminsAccess(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationID') authorizationID: string
  ): Promise<IAuthorizationPolicy> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    const platformPolicyUpdated =
      this.adminAuthorizationService.extendAuthorizationPolicyWithAuthorizationReset(
        platformPolicy
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicyUpdated,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization on a single authorization policy: ${agentInfo.email}`
    );

    return this.adminAuthorizationService.resetAuthorizationPolicy(
      authorizationID
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
