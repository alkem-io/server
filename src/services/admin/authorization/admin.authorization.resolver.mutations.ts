import { UseGuards } from '@nestjs/common';
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

@Resolver()
export class AdminAuthorizationResolverMutations {
  private authorizationGlobalAdminPolicy: IAuthorizationPolicy;
  private authorizationGlobalCommunityAdminPolicy: IAuthorizationPolicy;

  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationService: AuthorizationService,
    private adminAuthorizationService: AdminAuthorizationService
  ) {
    this.authorizationGlobalAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [AuthorizationRoleGlobal.GLOBAL_ADMIN],
        [AuthorizationPrivilege.GRANT]
      );
    this.authorizationGlobalCommunityAdminPolicy =
      this.authorizationPolicyService.createGlobalRolesAuthorizationPolicy(
        [
          AuthorizationRoleGlobal.GLOBAL_ADMIN,
          AuthorizationRoleGlobal.GLOBAL_COMMUNITY_ADMIN,
        ],
        [AuthorizationPrivilege.GRANT]
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
      AuthorizationPrivilege.GRANT,
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
      AuthorizationPrivilege.GRANT,
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
      AuthorizationPrivilege.GRANT,
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
      AuthorizationPrivilege.GRANT,
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
      this.authorizationGlobalCommunityAdminPolicy,
      AuthorizationPrivilege.GRANT,
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
      this.authorizationGlobalCommunityAdminPolicy,
      AuthorizationPrivilege.GRANT,
      `remove user global community admin: ${membershipData.userID}`
    );
    return await this.adminAuthorizationService.removeGlobalCommunityAdmin(
      membershipData
    );
  }
}
