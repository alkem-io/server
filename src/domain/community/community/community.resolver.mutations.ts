import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { IUserGroup } from '@domain/community/user-group';
import { CommunityService } from './community.service';
import {
  AuthorizationGlobalRoles,
  CurrentUser,
  Profiling,
} from '@src/common/decorators';
import {
  CreateApplicationInput,
  DeleteApplicationInput,
  IApplication,
  ApplicationEventInput,
} from '@domain/community/application';
import { CreateUserGroupInput } from '@domain/community/user-group';
import { ApplicationService } from '../application/application.service';
import {
  AssignCommunityMemberInput,
  ICommunity,
  RemoveCommunityMemberInput,
} from '@domain/community/community';
import { CommunityLifecycleOptionsProvider } from './community.lifecycle.options.provider';
import { GraphqlGuard } from '@core/authorization';
import { UserInfo } from '@core/authentication';
import { AuthorizationRoleGlobal } from '@common/enums';
@Resolver()
export class CommunityResolverMutations {
  constructor(
    @Inject(CommunityService) private communityService: CommunityService,
    @Inject(CommunityLifecycleOptionsProvider)
    private communityLifecycleOptionsProvider: CommunityLifecycleOptionsProvider,
    private applicationService: ApplicationService
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Creates a new User Group in the specified Community.',
  })
  @Profiling.api
  async createGroupOnCommunity(
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    return await this.communityService.createGroup(groupData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description: 'Assigns a User as a member of the specified Community.',
  })
  @Profiling.api
  async assignUserToCommunity(
    @Args('membershipData') membershipData: AssignCommunityMemberInput
  ): Promise<ICommunity> {
    return await this.communityService.assignMember(membershipData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description: 'Removes a User as a member of the specified Community.',
  })
  @Profiling.api
  async removeUserFromCommunity(
    @Args('membershipData') membershipData: RemoveCommunityMemberInput
  ): Promise<ICommunity> {
    return await this.communityService.removeMember(membershipData);
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Registered)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IApplication, {
    description: 'Creates Application for a User to join this Community.',
  })
  @Profiling.api
  async createApplication(
    @Args('applicationData') applicationData: CreateApplicationInput
  ): Promise<IApplication> {
    return await this.communityService.createApplication(applicationData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => IApplication, {
    description: 'Removes the specified User Application.',
  })
  async deleteUserApplication(
    @Args('deleteData') deleteData: DeleteApplicationInput
  ): Promise<IApplication> {
    return await this.applicationService.deleteApplication(deleteData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRoleGlobal.CommunityAdmin,
    AuthorizationRoleGlobal.Admin
  )
  @UseGuards(GraphqlGuard)
  @Mutation(() => IApplication, {
    description: 'Trigger an event on the Application.',
  })
  async eventOnApplication(
    @Args('applicationEventData')
    applicationEventData: ApplicationEventInput,
    @CurrentUser() userInfo: UserInfo
  ): Promise<IApplication> {
    return await this.communityLifecycleOptionsProvider.eventOnApplication(
      applicationEventData,
      userInfo.user
    );
  }
}
