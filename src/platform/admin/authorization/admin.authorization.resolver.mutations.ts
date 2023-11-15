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
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AuthResetService } from '@services/auth-reset/publisher/auth-reset.service';
import { IOrganization } from '@domain/community/organization';
import { GrantOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.grant.organization';
import { RevokeOrganizationAuthorizationCredentialInput } from './dto/authorization.dto.credential.revoke.organization';

@Resolver()
export class AdminAuthorizationResolverMutations {
  private authorizationGlobalAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private platformAuthorizationPolicyService: PlatformAuthorizationPolicyService,
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
    return await this.adminAuthorizationService.grantCredentialToUser(
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
    return await this.adminAuthorizationService.revokeCredentialFromUser(
      credentialRemoveData
    );
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
  @Mutation(() => String, {
    description: 'Reset the Authorization Policy on all entities',
  })
  @Profiling.api
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
}
