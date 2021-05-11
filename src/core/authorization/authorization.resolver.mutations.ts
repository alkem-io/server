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
    description: 'Assigns an authorization credential to a User.',
  })
  @Profiling.api
  async assignCredentialToUser(
    @Args('assignCredentialData')
    credentialAssignData: GrantAuthorizationCredentialInput,
    @CurrentUser() userInfo: UserInfo
  ): Promise<IUser> {
    return await this.authorizationService.assignCredential(
      credentialAssignData,
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
  async removeCredentialFromUser(
    @Args('removeCredentialData')
    credentialRemoveData: RemoveAuthorizationCredentialInput,
    @CurrentUser() userInfo: UserInfo
  ): Promise<IUser> {
    return await this.authorizationService.removeCredential(
      credentialRemoveData,
      userInfo
    );
  }
}
