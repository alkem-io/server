import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Float, Mutation } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { CommunityService } from './community.service';
import { Profiling } from '@src/common/decorators';
import { Application } from '@domain/community/application/application.entity';
import { ApplicationInput } from '@domain/community/application/application.dto';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';

@Resolver()
export class CommunityResolverMutations {
  constructor(
    @Inject(CommunityService) private communityService: CommunityService
  ) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description: 'Creates a new user group for the Community with the given id',
  })
  @Profiling.api
  async createGroupOnCommunity(
    @Args({ name: 'communityID', type: () => Float }) communityID: number,
    @Args({ name: 'groupName', type: () => String }) groupName: string
  ): Promise<IUserGroup> {
    const group = await this.communityService.createGroup(
      communityID,
      groupName
    );
    return group;
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Adds the user with the given identifier as a member of the specified Community',
  })
  @Profiling.api
  async addUserToCommunity(
    @Args('userID') userID: number,
    @Args('communityID') communityID: number
  ): Promise<IUserGroup> {
    const group = await this.communityService.addMember(userID, communityID);
    return group;
  }

  @Roles(AuthorizationRoles.Members)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Application, {
    description: 'Create application to join this Community',
  })
  @Profiling.api
  async createApplication(
    @Args('communityID') communityID: number,
    @Args('applicationData') applicationData: ApplicationInput
  ): Promise<Application> {
    return await this.communityService.createApplication(
      communityID,
      applicationData
    );
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Application, {
    description: 'Create application to join this ecoverse',
  })
  @Profiling.api
  async approveApplication(
    @Args('ID') applicationID: number
  ): Promise<Application> {
    return await this.communityService.approveApplication(applicationID);
  }
}
