import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IUser } from '@domain/community/user/user.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy';
import { AdminAuthorizationService } from './admin.authorization.service';
import { GrantAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant';
import { RevokeAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { GLOBAL_POLICY_AUTHORIZATION_GRANT_GLOBAL_ADMIN } from '@common/constants/authorization/global.policy.constants';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { AuthResetService } from '@services/auth-reset/publisher/auth-reset.service';
import { IOrganization } from '@domain/community/organization';
import { GrantOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant.organization';
import { RevokeOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke.organization';
import { NotificationInputPlatformGlobalRoleChange } from '@services/adapters/notification-adapter/dto/platform/notification.dto.input.platform.global.role.change';
import { RoleChangeType } from '@alkemio/notifications-lib';
import { InstrumentResolver } from '@src/apm/decorators';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { EntityManager } from 'typeorm';
import { InjectEntityManager } from '@nestjs/typeorm';
import { SpaceService } from '@domain/space/space/space.service';
import { Space } from '@domain/space/space/space.entity';
import { SpaceLevel } from '@common/enums/space.level';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';

@InstrumentResolver()
@Resolver()
export class AdminAuthorizationResolverMutations {
  private authorizationGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    private authorizationService: AuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private authResetService: AuthResetService,
    private virtualContributorService: VirtualContributorService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    private spaceService: SpaceService
  ) {
    this.authorizationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.GRANT_GLOBAL_ADMINS],
        GLOBAL_POLICY_AUTHORIZATION_GRANT_GLOBAL_ADMIN
      );
  }

  @Mutation(() => IUser, {
    description: 'Grants an authorization credential to a User.',
  })
  async grantCredentialToUser(
    @Args('grantCredentialData')
    grantCredentialData: GrantAuthorizationCredentialInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IUser> {
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `grant credential: ${agentInfo.email}`
    );

    const user =
      await this.adminAuthorizationService.grantCredentialToUser(
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
    const user =
      await this.adminAuthorizationService.revokeCredentialFromUser(
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

  @Mutation(() => Boolean, {
    description:
      'Ensure all access privileges for the platform roles are re-calculated',
  })
  public async authorizationPlatformRolesAccessReset(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN, // todo: replace with AUTHORIZATION_RESET once that has been granted
      `reset platformRolesAccess on all Spaces: ${agentInfo.email}`
    );

    const spaces = await this.entityManager.find(Space, {
      where: {
        level: SpaceLevel.L0,
      },
    });
    for (const space of spaces) {
      await this.spaceService.updatePlatformRolesAccessRecursively(space);
    }
    return true;
  }

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

  @Mutation(() => Boolean, {
    description: 'Refresh the Bodies of Knowledge on All VCs',
  })
  public async refreshAllBodiesOfKnowledge(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    const platformPolicy =
      await this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      `reset authorization on platform: ${agentInfo.email}`
    );

    return this.virtualContributorService.refreshAllBodiesOfKnowledge(
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
    await this.notificationPlatformAdapter.platformGlobalRoleChanged(
      notificationInput
    );
  }
}
