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
  RemoveAuthorizationCredentialInput,
} from '@core/authorization';
import { AuthorizationService } from './authorization.service';
import { IUser, User } from '@domain/community/user';
import { AuthorizationRolesGlobal } from './authorization.roles.global';
import { GraphqlGuard } from './graphql.guard';
import { UserInfo } from '@core/authentication';

@Resolver()
export class AuthorizationResolverMutations {
  constructor(private authorizationService: AuthorizationService) {}

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => User, {
    description: 'Grants an authorization credential to a User.',
  })
  @Profiling.api
  async grantCredentialToUser(
    @Args('grantCredentialData')
    grantCredentialData: GrantAuthorizationCredentialInput,
    @CurrentUser() userInfo: UserInfo
  ): Promise<IUser> {
    return await this.authorizationService.grantCredential(
      grantCredentialData,
      userInfo
    );
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => User, {
    description: 'Removes an authorization credential from a User.',
  })
  @Profiling.api
  async revokeCredentialFromUser(
    @Args('revokeCredentialData')
    credentialRemoveData: RemoveAuthorizationCredentialInput,
    @CurrentUser() userInfo: UserInfo
  ): Promise<IUser> {
    return await this.authorizationService.revokeCredential(
      credentialRemoveData,
      userInfo
    );
  }
}
