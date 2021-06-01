import { Inject, UseGuards } from '@nestjs/common';
import { Resolver } from '@nestjs/graphql';
import { Args, Mutation } from '@nestjs/graphql';
import { IUserGroup } from '@domain/community/user-group';
import { CommunityService } from './community.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
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
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { UserService } from '../user/user.service';
@Resolver()
export class CommunityResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private userService: UserService,
    private communityService: CommunityService,
    @Inject(CommunityLifecycleOptionsProvider)
    private communityLifecycleOptionsProvider: CommunityLifecycleOptionsProvider,
    private applicationService: ApplicationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Creates a new User Group in the specified Community.',
  })
  @Profiling.api
  async createGroupOnCommunity(
    @CurrentUser() userInfo: UserInfo,
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    const community = await this.communityService.getCommunityOrFail(
      groupData.parentID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      community.authorization,
      AuthorizationPrivilege.CREATE,
      `create group community: ${community.displayName}`
    );
    const group = await this.communityService.createGroup(groupData);
    group.authorization = await this.authorizationEngine.inheritParentAuthorization(
      group.authorization,
      community.authorization
    );
    return group;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description: 'Assigns a User as a member of the specified Community.',
  })
  @Profiling.api
  async assignUserToCommunity(
    @CurrentUser() userInfo: UserInfo,
    @Args('membershipData') membershipData: AssignCommunityMemberInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      membershipData.communityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      community.authorization,
      AuthorizationPrivilege.UPDATE,
      `assign user community: ${community.displayName}`
    );
    return await this.communityService.assignMember(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description: 'Removes a User as a member of the specified Community.',
  })
  @Profiling.api
  async removeUserFromCommunity(
    @CurrentUser() userInfo: UserInfo,
    @Args('membershipData') membershipData: RemoveCommunityMemberInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      membershipData.communityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      community.authorization,
      AuthorizationPrivilege.UPDATE,
      `remove user community: ${community.displayName}`
    );
    return await this.communityService.removeMember(membershipData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IApplication, {
    description: 'Creates Application for a User to join this Community.',
  })
  @Profiling.api
  async createApplication(
    @CurrentUser() userInfo: UserInfo,
    @Args('applicationData') applicationData: CreateApplicationInput
  ): Promise<IApplication> {
    const community = await this.communityService.getCommunityOrFail(
      applicationData.parentID
    );
    // Check that the application creation is authorized, after first updating the rules for the community entity
    // so that the current user can also update their details (by creating an application)
    const user = await this.userService.getUserOrFail(applicationData.userID);
    const authorization = this.authorizationEngine.appendCredentialAuthorizationRule(
      community.authorization,
      {
        type: AuthorizationCredential.UserSelfManagement,
        resourceID: user.id,
      },
      [AuthorizationPrivilege.UPDATE]
    );

    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      authorization,
      AuthorizationPrivilege.UPDATE,
      `create application community: ${community.displayName}`
    );

    // Authorized, so create + return
    const application = await this.communityService.createApplication(
      applicationData
    );
    application.authorization = await this.authorizationEngine.inheritParentAuthorization(
      application.authorization,
      community.authorization
    );
    return application;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IApplication, {
    description: 'Removes the specified User Application.',
  })
  async deleteUserApplication(
    @CurrentUser() userInfo: UserInfo,
    @Args('deleteData') deleteData: DeleteApplicationInput
  ): Promise<IApplication> {
    const community = await this.communityService.getCommunityOrFail(
      deleteData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      community.authorization,
      AuthorizationPrivilege.UPDATE,
      `delete application community: ${community.displayName}`
    );
    return await this.applicationService.deleteApplication(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IApplication, {
    description: 'Trigger an event on the Application.',
  })
  async eventOnApplication(
    @Args('applicationEventData')
    applicationEventData: ApplicationEventInput,
    @CurrentUser() userInfo: UserInfo
  ): Promise<IApplication> {
    const community = await this.communityService.getCommunityOrFail(
      applicationEventData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      userInfo,
      community.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on community: ${community.displayName}`
    );
    return await this.communityLifecycleOptionsProvider.eventOnApplication(
      applicationEventData,
      userInfo
    );
  }
}
