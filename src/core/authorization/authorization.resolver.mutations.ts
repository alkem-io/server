import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import {
  AuthorizationGlobalRoles,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import {
  GrantAuthorizationCredentialInput,
  RevokeAuthorizationCredentialInput,
} from '@core/authorization';
import { AuthorizationService } from './authorization.service';
import { IUser } from '@domain/community/user';
import { GraphqlGuard } from './graphql.guard';
import { AgentInfo } from '@core/authentication';
import { AuthorizationRoleGlobal } from '@common/enums';

@Resolver()
export class AuthorizationResolverMutations {
  constructor(private authorizationService: AuthorizationService) {}

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
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
    return await this.authorizationService.grantCredential(
      grantCredentialData,
      agentInfo
    );
  }

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
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
    return await this.authorizationService.revokeCredential(
      credentialRemoveData,
      agentInfo
    );
  }
}
