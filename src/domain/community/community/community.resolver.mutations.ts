import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { CommunityService } from './community.service';
import { AuthorizationGlobalRoles, Profiling } from '@src/common/decorators';
import {
  CreateApplicationInput,
  DeleteApplicationInput,
  Application,
  IApplication,
  ApplicationEventInput,
} from '@domain/community/application';
import { CreateUserGroupInput } from '@domain/community/user-group';
import { ApplicationService } from '../application/application.service';
import {
  AssignCommunityMemberInput,
  RemoveCommunityMemberInput,
} from '@domain/community/community';
import { CommunityLifecycleOptionsProvider } from './community.lifecycle.options.provider';
import {
  AuthorizationRolesGlobal,
  AuthorizationRulesGuard,
} from '@core/authorization';
import { IUser } from '@domain/community/user';
@Resolver()
export class CommunityResolverMutations {
  constructor(
    @Inject(CommunityService) private communityService: CommunityService,
    @Inject(CommunityLifecycleOptionsProvider)
    private communityLifecycleOptionsProvider: CommunityLifecycleOptionsProvider,
    private applicationService: ApplicationService
  ) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => UserGroup, {
    description: 'Creates a new User Group in the specified Community.',
  })
  @Profiling.api
  async createGroupOnCommunity(
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    return await this.communityService.createGroup(groupData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => UserGroup, {
    description: 'Assigns a User as a member of the specified Community.',
  })
  @Profiling.api
  async assignUserToCommunity(
    @Args('membershipData') membershipData: AssignCommunityMemberInput
  ): Promise<IUser> {
    return await this.communityService.assignMember(membershipData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => UserGroup, {
    description: 'Removes a User as a member of the specified Community.',
  })
  @Profiling.api
  async removeUserFromCommunity(
    @Args('membershipData') membershipData: RemoveCommunityMemberInput
  ): Promise<IUser> {
    return await this.communityService.removeMember(membershipData);
  }

  // All registered users can create applications
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Application, {
    description: 'Creates Application for a User to join this Community.',
  })
  @Profiling.api
  async createApplication(
    @Args('applicationData') applicationData: CreateApplicationInput
  ): Promise<IApplication> {
    return await this.communityService.createApplication(applicationData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Application, {
    description: 'Removes the specified User Application.',
  })
  async deleteUserApplication(
    @Args('deleteData') deleteData: DeleteApplicationInput
  ): Promise<IApplication> {
    return await this.applicationService.deleteApplication(deleteData);
  }

  @AuthorizationGlobalRoles(
    AuthorizationRolesGlobal.CommunityAdmin,
    AuthorizationRolesGlobal.Admin
  )
  @UseGuards(AuthorizationRulesGuard)
  @Mutation(() => Application, {
    description: 'Trigger an event on the Application.',
  })
  async eventOnApplication(
    @Args('applicationEventData')
    applicationEventData: ApplicationEventInput
  ): Promise<IApplication> {
    return await this.communityLifecycleOptionsProvider.eventOnApplication(
      applicationEventData
    );
  }
}
