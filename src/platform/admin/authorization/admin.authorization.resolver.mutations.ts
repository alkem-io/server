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
import { AssignGlobalAdminInput } from './dto/authorization.dto.assign.global.admin';
import { RemoveGlobalAdminInput } from './dto/authorization.dto.remove.global.admin';
import { AssignGlobalCommunityAdminInput } from './dto/authorization.dto.assign.global.community.admin';
import { RemoveGlobalCommunityAdminInput } from './dto/authorization.dto.remove.global.community.admin';
import { AdminAuthorizationService } from './admin.authorization.service';
import { GrantAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant';
import { RevokeAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { AssignGlobalHubsAdminInput } from './dto/authorization.dto.assign.global.hubs.admin';
import { RemoveGlobalHubsAdminInput } from './dto/authorization.dto.remove.global.hubs.admin';
import { GLOBAL_POLICY_AUTHORIZATION_GRANT_GLOBAL_ADMIN } from '@common/constants/authorization/global.policy.constants';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { HubService } from '@domain/challenge/hub/hub.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { HubAuthorizationService } from '@domain/challenge/hub/hub.service.authorization';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver()
export class AdminAuthorizationResolverMutations {
  private authorizationGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private hubAuthorizationService: HubAuthorizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private userAuthorizationService: UserAuthorizationService,
    private authorizationService: AuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private hubService: HubService,
    private organizationService: OrganizationService,
    private userService: UserService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
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
    return await this.adminAuthorizationService.grantCredential(
      grantCredentialData
    );
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
    return await this.adminAuthorizationService.revokeCredential(
      credentialRemoveData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User as a Global Admin.',
  })
  @Profiling.api
  async assignUserAsGlobalAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignGlobalAdminInput
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `assign user global admin: ${membershipData.userID}`
    );
    return await this.adminAuthorizationService.assignGlobalAdmin(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from being a Global Admin.',
  })
  @Profiling.api
  async removeUserAsGlobalAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveGlobalAdminInput
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `remove user global admin: ${membershipData.userID}`
    );
    return await this.adminAuthorizationService.removeGlobalAdmin(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User as a Global Community Admin.',
  })
  @Profiling.api
  async assignUserAsGlobalCommunityAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignGlobalCommunityAdminInput
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `assign user global communityadmin: ${membershipData.userID}`
    );
    return await this.adminAuthorizationService.assignGlobalCommunityAdmin(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from being a Global Community Admin.',
  })
  @Profiling.api
  async removeUserAsGlobalCommunityAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveGlobalCommunityAdminInput
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `remove user global community admin: ${membershipData.userID}`
    );
    return await this.adminAuthorizationService.removeGlobalCommunityAdmin(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User as a Global Hubs Admin.',
  })
  @Profiling.api
  async assignUserAsGlobalHubsAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignGlobalHubsAdminInput
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `assign user global hubs admin: ${membershipData.userID}`
    );
    return await this.adminAuthorizationService.assignGlobalHubsAdmin(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from being a Global Hubs Admin.',
  })
  @Profiling.api
  async removeUserAsGlobalHubsAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveGlobalHubsAdminInput
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `remove user global hubs admin: ${membershipData.userID}`
    );
    return await this.adminAuthorizationService.removeGlobalHubsAdmin(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description: 'Reset the Authorization Policy on all entities',
  })
  @Profiling.api
  async authorizationPolicyResetAll(
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<boolean> {
    const platformPolicy =
      this.platformAuthorizationPolicyService.getPlatformAuthorizationPolicy();
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformPolicy,
      AuthorizationPrivilege.UPDATE, // todo: replace with AUTHORIZATION_RESET once that has been granted
      `reset authorization on platform: ${agentInfo.email}`
    );

    const [hubs, organizations, users] = await Promise.all([
      this.hubService.getAllHubs(),
      this.organizationService.getOrganizations({}),
      this.userService.getUsers({}),
    ]);

    const resetHubAuthPromises = hubs.map(async hub => {
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        hub.authorization,
        AuthorizationPrivilege.UPDATE, // todo: replace with AUTHORIZATION_RESET once that has been granted
        `reset authorization definition: ${agentInfo.email}`
      );
      await this.hubAuthorizationService.applyAuthorizationPolicy(hub);
    });

    const resetOrgAuthPromises = organizations.map(async organization => {
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        organization.authorization,
        AuthorizationPrivilege.UPDATE, //// todo: replace with AUTHORIZATION_RESET once that has been granted
        `reset authorization definition on organization: ${organization.id}`
      );
      await this.organizationAuthorizationService.applyAuthorizationPolicy(
        organization
      );
    });

    const resetUserAuthPromises = users.map(async user => {
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        user.authorization,
        AuthorizationPrivilege.UPDATE, // todo: replace with AUTHORIZATION_RESET once that has been granted
        `reset authorization definition on user: ${user.id}`
      );
      await this.userAuthorizationService.applyAuthorizationPolicy(user);
    });

    const allPromises = [
      ...resetHubAuthPromises,
      ...resetOrgAuthPromises,
      ...resetUserAuthPromises,
    ];

    const results = await Promise.allSettled(allPromises);

    let res = true;
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        res = false;
        this.logger.error(
          `Error with promise at index ${index}: ${result.reason}`
        );
      }
    });

    return res;
  }
}
