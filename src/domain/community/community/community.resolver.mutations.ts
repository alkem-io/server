import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { Roles } from '@common/decorators/roles.decorator';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { CommunityService } from './community.service';
import { Profiling } from '@src/common/decorators';
import {
  CreateApplicationInput,
  DeleteApplicationInput,
  Application,
} from '@domain/community/application';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { CreateUserGroupInput } from '@domain/community/user-group';
import { ApplicationService } from '../application/application.service';
import { AssignCommunityMemberInput } from '@domain/community/community';
import { RemoveCommunityMemberInput } from './community.dto.remove.member';

@Resolver()
export class CommunityResolverMutations {
  constructor(
    @Inject(CommunityService) private communityService: CommunityService,
    private applicationService: ApplicationService
  ) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description: 'Creates a new user group for the Community with the given id',
  })
  @Profiling.api
  async createGroupOnCommunity(
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    return await this.communityService.createGroup(groupData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Adds the user with the given identifier as a member of the specified Community',
  })
  @Profiling.api
  async assignUserToCommunity(
    @Args('membershipData') membershipData: AssignCommunityMemberInput
  ): Promise<IUserGroup> {
    return await this.communityService.assignMember(membershipData);
  }

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => UserGroup, {
    description:
      'Removes the user with the given identifier as a member of the specified Community',
  })
  @Profiling.api
  async removeUserFromCommunity(
    @Args('membershipData') membershipData: RemoveCommunityMemberInput
  ): Promise<IUserGroup> {
    return await this.communityService.removeMember(membershipData);
  }

  // All registered users can create applications
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Application, {
    description: 'Create application to join this Community',
  })
  @Profiling.api
  async createApplication(
    @Args('applicationData') applicationData: CreateApplicationInput
  ): Promise<Application> {
    return await this.communityService.createApplication(applicationData);
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

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Application, {
    description: 'Removes user application with the specified applicationID',
  })
  //@Profiling.api
  async deleteUserApplication(
    @Args('deleteData') deleteData: DeleteApplicationInput
  ): Promise<Application> {
    return await this.applicationService.deleteApplication(deleteData);
  }
}
