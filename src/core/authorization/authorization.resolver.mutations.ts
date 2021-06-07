import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import {
  GrantAuthorizationCredentialInput,
  RevokeAuthorizationCredentialInput,
} from '@core/authorization';
import { AuthorizationService } from './authorization.service';
import { IUser } from '@domain/community/user';
import { GraphqlGuard } from './graphql.guard';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege, AuthorizationRoleGlobal } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { IAuthorizationDefinition } from '@domain/common/authorization-definition';

@Resolver()
export class AuthorizationResolverMutations {
  private authorizationDefinition: IAuthorizationDefinition;

  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private authorizationService: AuthorizationService
  ) {
    this.authorizationDefinition = this.authorizationEngine.createGlobalRolesAuthorizationDefinition(
      [AuthorizationRoleGlobal.CommunityAdmin, AuthorizationRoleGlobal.Admin],
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
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      this.authorizationDefinition,
      AuthorizationPrivilege.GRANT,
      `grant credential: ${agentInfo.email}`
    );
    return await this.authorizationService.grantCredential(
      grantCredentialData,
      agentInfo
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
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      this.authorizationDefinition,
      AuthorizationPrivilege.GRANT,
      `revoke credential: ${agentInfo.email}`
    );
    return await this.authorizationService.revokeCredential(
      credentialRemoveData,
      agentInfo
    );
  }
}
