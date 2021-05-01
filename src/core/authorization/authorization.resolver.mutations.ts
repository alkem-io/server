import { UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { Profiling } from '@src/common/decorators';

import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import {
  AuthorizationAssignCapabilityInput,
  AuthorizationRemoveCapabilityInput,
} from '@core/authorization';
import { AuthorizationService } from './authorization.service';
import { IUser } from '@domain/community/user';

@Resolver()
export class AuthorizationResolverMutations {
  constructor(private authorizationService: AuthorizationService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description: 'Assigns an authorization capability to a User.',
  })
  @Profiling.api
  async assignCapabilityToUser(
    @Args('assignCapabilityData')
    capabilityAssignData: AuthorizationAssignCapabilityInput
  ): Promise<IUser> {
    return await this.authorizationService.assignCapability(
      capabilityAssignData
    );
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description: 'Removes an authorization capability to a User.',
  })
  @Profiling.api
  async removeCapabilityFromUser(
    @Args('removeCapabilityData')
    capabilityRemoveData: AuthorizationRemoveCapabilityInput
  ): Promise<IUser> {
    return await this.authorizationService.removeCapability(
      capabilityRemoveData
    );
  }
}
