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
import { ApplicationService } from '@domain/community/application/application.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunityLifecycleOptionsProvider } from './community.lifecycle.options.provider';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationCredential, AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/platform/authorization-engine/authorization-engine.service';
import { UserService } from '@domain/community/user/user.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { UserAuthorizationService } from '../user/user.service.authorization';
import { PubSubEngine } from 'apollo-server-express';
import { PUB_SUB } from '@services/platform/subscription/subscription.module';
import { CommunityRemoveMessageInput } from './dto/community.dto.remove.message';
import { CommunitySendMessageInput } from './dto/community.dto.send.message';
import { SubscriptionType } from '@common/enums/subscription.type';
import { AssignCommunityMemberInput } from './dto/community.dto.assign.member';
import { RemoveCommunityMemberInput } from './dto/community.dto.remove.member';
@Resolver()
export class CommunityResolverMutations {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private authorizationEngine: AuthorizationEngineService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communityService: CommunityService,
    @Inject(CommunityLifecycleOptionsProvider)
    private communityLifecycleOptionsProvider: CommunityLifecycleOptionsProvider,
    private applicationService: ApplicationService,
    @Inject(PUB_SUB)
    private readonly subscriptionHandler: PubSubEngine
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUserGroup, {
    description: 'Creates a new User Group in the specified Community.',
  })
  @Profiling.api
  async createGroupOnCommunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('groupData') groupData: CreateUserGroupInput
  ): Promise<IUserGroup> {
    const community = await this.communityService.getCommunityOrFail(
      groupData.parentID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.CREATE,
      `create group community: ${community.displayName}`
    );
    const group = await this.communityService.createGroup(groupData);
    group.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        group.authorization,
        community.authorization
      );
    return await this.userGroupAuthorizationService.applyAuthorizationPolicy(
      group
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description: 'Assigns a User as a member of the specified Community.',
  })
  @Profiling.api
  async assignUserToCommunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignCommunityMemberInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      membershipData.communityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.GRANT,
      `assign user community: ${community.displayName}`
    );
    await this.communityService.assignMember(membershipData);

    // reset the user authorization policy so that their profile is visible to other community members
    const user = await this.userService.getUserOrFail(membershipData.userID);
    await this.userAuthorizationService.applyAuthorizationPolicy(user);

    return community;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description: 'Removes a User as a member of the specified Community.',
  })
  @Profiling.api
  async removeUserFromCommunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveCommunityMemberInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      membershipData.communityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.GRANT,
      `remove user community: ${community.displayName}`
    );

    await this.communityService.removeMember(membershipData);
    // reset the user authorization policy so that their profile is not visible
    // to other community members
    const user = await this.userService.getUserOrFail(membershipData.userID);
    await this.userAuthorizationService.applyAuthorizationPolicy(user);
    return community;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IApplication, {
    description: 'Creates Application for a User to join this Community.',
  })
  @Profiling.api
  async createApplication(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('applicationData') applicationData: CreateApplicationInput
  ): Promise<IApplication> {
    const community = await this.communityService.getCommunityOrFail(
      applicationData.parentID
    );
    // Check that the application creation is authorized, after first updating the rules for the community entity
    // so that the current user can also update their details (by creating an application)
    const user = await this.userService.getUserOrFail(applicationData.userID);
    const authorization =
      this.authorizationPolicyService.appendCredentialAuthorizationRule(
        community.authorization,
        {
          type: AuthorizationCredential.UserSelfManagement,
          resourceID: user.id,
        },
        [AuthorizationPrivilege.UPDATE]
      );

    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      authorization,
      AuthorizationPrivilege.UPDATE,
      `create application community: ${community.displayName}`
    );

    // Authorized, so create + return
    const application = await this.communityService.createApplication(
      applicationData
    );
    application.authorization =
      await this.authorizationPolicyService.inheritParentAuthorization(
        application.authorization,
        community.authorization
      );
    // also grant the user privileges to manage their own application
    application.authorization =
      await this.authorizationPolicyService.appendCredentialAuthorizationRule(
        application.authorization,
        {
          type: AuthorizationCredential.UserSelfManagement,
          resourceID: user.id,
        },
        [
          AuthorizationPrivilege.READ,
          AuthorizationPrivilege.UPDATE,
          AuthorizationPrivilege.DELETE,
        ]
      );
    // Trigger an event for subscriptions
    this.subscriptionHandler.publish(
      SubscriptionType.USER_APPLICATION_RECEIVED,
      {
        application: application,
      }
    );
    return await this.applicationService.save(application);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IApplication, {
    description: 'Removes the specified User Application.',
  })
  async deleteUserApplication(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteApplicationInput
  ): Promise<IApplication> {
    const application = await this.applicationService.getApplicationOrFail(
      deleteData.ID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      application.authorization,
      AuthorizationPrivilege.UPDATE,
      `delete application community: ${application.id}`
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
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IApplication> {
    const application = await this.applicationService.getApplicationOrFail(
      applicationEventData.applicationID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      application.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on application: ${application.id}`
    );
    return await this.communityLifecycleOptionsProvider.eventOnApplication(
      applicationEventData,
      agentInfo
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description: 'Sends an update message on the specified community',
  })
  @Profiling.api
  async sendMessageToCommunityUpdates(
    @Args('messageData') messageData: CommunitySendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const community = await this.communityService.getCommunityOrFail(
      messageData.communityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.UPDATE,
      `community send message: ${community.displayName}`
    );
    return await this.communityService.sendMessageToCommunityUpdates(
      community,
      agentInfo.email,
      messageData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description: 'Removes an update message from the specified community',
  })
  @Profiling.api
  async removeMessageFromCommunityUpdates(
    @Args('messageData') messageData: CommunityRemoveMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const community = await this.communityService.getCommunityOrFail(
      messageData.communityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.UPDATE,
      `community send message: ${community.displayName}`
    );
    await this.communityService.removeMessageFromCommunityUpdates(
      community,
      agentInfo.email,
      messageData
    );

    return messageData.messageId;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description: 'Sends a message to the discussions room on the community',
  })
  @Profiling.api
  async sendMessageToCommunityDiscussions(
    @Args('messageData') messageData: CommunitySendMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const community = await this.communityService.getCommunityOrFail(
      messageData.communityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.READ,
      `community send discussion message: ${community.displayName}`
    );
    return await this.communityService.sendMessageToCommunityDiscussions(
      community,
      agentInfo.email,
      messageData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => String, {
    description: 'Removes a discussion message from the specified community',
  })
  @Profiling.api
  async removeMessageFromCommunityDiscussions(
    @Args('messageData') messageData: CommunityRemoveMessageInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<string> {
    const community = await this.communityService.getCommunityOrFail(
      messageData.communityID
    );
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.UPDATE,
      `community send message: ${community.displayName}`
    );
    await this.communityService.removeMessageFromCommunityDiscussions(
      community,
      agentInfo.email,
      messageData
    );

    return messageData.messageId;
  }
}
