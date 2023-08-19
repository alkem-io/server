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
import { AssignGlobalSpacesAdminInput } from './dto/authorization.dto.assign.global.spaces.admin';
import { RemoveGlobalSpacesAdminInput } from './dto/authorization.dto.remove.global.spaces.admin';
import { GLOBAL_POLICY_AUTHORIZATION_GRANT_GLOBAL_ADMIN } from '@common/constants/authorization/global.policy.constants';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { SpaceService } from '@domain/challenge/space/space.service';
import { OrganizationService } from '@domain/community/organization/organization.service';
import { UserService } from '@domain/community/user/user.service';
import { SpaceAuthorizationService } from '@domain/challenge/space/space.service.authorization';
import { OrganizationAuthorizationService } from '@domain/community/organization/organization.service.authorization';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Resolver()
export class AdminAuthorizationResolverMutations {
  private authorizationGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
    private spaceAuthorizationService: SpaceAuthorizationService,
    private organizationAuthorizationService: OrganizationAuthorizationService,
    private userAuthorizationService: UserAuthorizationService,
    private authorizationService: AuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService,
    private spaceService: SpaceService,
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
    description: 'Assigns a User as a Global Spaces Admin.',
  })
  @Profiling.api
  async assignUserAsGlobalSpacesAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignGlobalSpacesAdminInput
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `assign user global spaces admin: ${membershipData.userID}`
    );
    return await this.adminAuthorizationService.assignGlobalSpacesAdmin(
      membershipData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from being a Global Spaces Admin.',
  })
  @Profiling.api
  async removeUserAsGlobalSpacesAdmin(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveGlobalSpacesAdminInput
  ): Promise<IUser> {
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      this.authorizationGlobalAdminPolicy,
      AuthorizationPrivilege.GRANT_GLOBAL_ADMINS,
      `remove user global spaces admin: ${membershipData.userID}`
    );
    return await this.adminAuthorizationService.removeGlobalSpacesAdmin(
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

    const [spaces, organizations, users] = await Promise.all([
      this.spaceService.getAllSpaces({
        relations: {
          preferenceSet: {
            preferences: true,
          },
        },
      }),
      this.organizationService.getOrganizations({}),
      this.userService.getUsers({}),
    ]);

    const resetSpaceAuthPromises = spaces.map(async space => {
      this.authorizationService.grantAccessOrFail(
        agentInfo,
        space.authorization,
        AuthorizationPrivilege.UPDATE, // todo: replace with AUTHORIZATION_RESET once that has been granted
        `reset authorization definition: ${agentInfo.email}`
      );
      await this.spaceAuthorizationService.applyAuthorizationPolicy(space);
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
      ...resetSpaceAuthPromises,
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
