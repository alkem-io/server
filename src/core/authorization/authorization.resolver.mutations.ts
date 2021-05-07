import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
import {
  AssignAuthorizationCredentialInput,
  RemoveAuthorizationCredentialInput,
} from '@core/authorization';
import { AuthorizationService } from './authorization.service';
import { IUser, User } from '@domain/community/user';
import { AuthorizationRolesGlobal } from './authorization.roles.global';
import { AuthorizationRulesGuard } from './authorization.rules.guard';

@Resolver()
export class AuthorizationResolverMutations {
  constructor(private authorizationService: AuthorizationService) {}

  // @AuthorizationGlobalRoles(AuthorizationRolesGlobal.CommunityAdmin, AuthorizationRolesGlobal.Admin)
  // @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => User, {
    description: 'Assigns an authorization credential to a User.',
  })
  @Profiling.api
  async assignCredentialToUser(
    @Args('assignCredentialData')
    credentialAssignData: AssignAuthorizationCredentialInput
  ): Promise<IUser> {
    return await this.authorizationService.assignCredential(
      credentialAssignData
    );
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => User, {
    description: 'Removes an authorization credential from a User.',
  })
  @Profiling.api
  async removeCredentialFromUser(
    @Args('removeCredentialData')
    credentialRemoveData: RemoveAuthorizationCredentialInput
  ): Promise<IUser> {
    return await this.authorizationService.removeCredential(
      credentialRemoveData
    );
  }
}
