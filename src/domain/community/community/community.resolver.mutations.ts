import { Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CreateUserGroupInput, IUserGroup } from '@domain/community/user-group';
import { CommunityService } from './community.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IApplication } from '@domain/community/application';
import { ApplicationService } from '@domain/community/application/application.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunityLifecycleOptionsProvider } from './community.lifecycle.options.provider';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from '@domain/community/user/user.service';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { UserAuthorizationService } from '../user/user.service.authorization';
import { NOTIFICATIONS_SERVICE } from '@common/constants/providers';
import { AssignCommunityMemberInput } from './dto/community.dto.assign.member';
import { RemoveCommunityMemberInput } from './dto/community.dto.remove.member';
import { ClientProxy } from '@nestjs/microservices';
import { EventType } from '@common/enums/event.type';
import { NotificationsPayloadBuilder } from '@core/microservices';
import { DeleteApplicationInput } from '../application/dto/application.dto.delete';
import { ApplicationEventInput } from '../application/dto/application.dto.event';
import { ApplicationAuthorizationService } from '../application/application.service.authorization';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CommunityJoinInput } from './dto/community.dto.join';
import { CommunityApplyInput } from './dto/community.dto.apply';
import { CommunityMemberClaim } from '@services/platform/trust-registry/trust.registry.claim/claim.community.member';
import { AgentBeginVerifiedCredentialOfferOutput } from '@domain/agent/agent/dto/agent.dto.verified.credential.offer.begin.output';
import { AlkemioUserClaim } from '@services/platform/trust-registry/trust.registry.claim/claim.alkemio.user';
import { CreateFeedbackOnCommunityContextInput } from '@domain/community/community/dto/community.dto.create.feedback.on.context';

@Resolver()
export class CommunityResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communityService: CommunityService,
    private notificationsPayloadBuilder: NotificationsPayloadBuilder,
    @Inject(CommunityLifecycleOptionsProvider)
    private communityLifecycleOptionsProvider: CommunityLifecycleOptionsProvider,
    private applicationService: ApplicationService,
    private agentService: AgentService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    @Inject(NOTIFICATIONS_SERVICE) private notificationsClient: ClientProxy
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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.CREATE,
      `create group community: ${community.displayName}`
    );
    const group = await this.communityService.createGroup(groupData);
    return await this.userGroupAuthorizationService.applyAuthorizationPolicy(
      group,
      community.authorization
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
    await this.authorizationService.grantAccessOrFail(
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
    await this.authorizationService.grantAccessOrFail(
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
    description: 'Apply to join the specified Community as a member.',
  })
  @Profiling.api
  async applyForCommunityMembership(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('applicationData') applicationData: CommunityApplyInput
  ): Promise<IApplication> {
    const community = await this.communityService.getCommunityOrFail(
      applicationData.communityID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.COMMUNITY_APPLY,
      `create application community: ${community.displayName}`
    );

    const application = await this.communityService.createApplication({
      parentID: community.id,
      questions: applicationData.questions,
      userID: agentInfo.userID,
    });

    const savedApplication =
      await this.applicationAuthorizationService.applyAuthorizationPolicy(
        application,
        community.authorization
      );

    const payload =
      await this.notificationsPayloadBuilder.buildApplicationCreatedNotificationPayload(
        agentInfo.userID,
        agentInfo.userID,
        community
      );

    this.notificationsClient.emit<number>(
      EventType.COMMUNITY_APPLICATION_CREATED,
      payload
    );

    return savedApplication;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description:
      'Join the specified Community as a member, without going through an approval process.',
  })
  @Profiling.api
  async joinCommunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('joinCommunityData') joiningData: CommunityJoinInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      joiningData.communityID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.COMMUNITY_JOIN,
      `join community: ${community.displayName}`
    );

    const payload =
      await this.notificationsPayloadBuilder.buildCommunityNewMemberPayload(
        agentInfo.userID,
        community
      );
    this.notificationsClient.emit(EventType.COMMUNITY_NEW_MEMBER, payload);

    return await this.communityService.assignMember({
      userID: agentInfo.userID,
      communityID: joiningData.communityID,
    });
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
    await this.authorizationService.grantAccessOrFail(
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
    await this.authorizationService.grantAccessOrFail(
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
  @Mutation(() => AgentBeginVerifiedCredentialOfferOutput, {
    description: 'Generate community member credential offer',
  })
  async beginCommunityMemberVerifiedCredentialOfferInteraction(
    @Args({ name: 'communityID', type: () => String }) communityID: string,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<AgentBeginVerifiedCredentialOfferOutput> {
    const community = await this.communityService.getCommunityOrFail(
      communityID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.READ,
      `beginCommunityMemberCredentialOfferInteraction: ${community.id}`
    );

    return await this.agentService.beginCredentialOfferInteraction(
      agentInfo.agentID,
      [
        {
          type: 'CommunityMemberCredential',
          claims: [
            new AlkemioUserClaim({
              userID: agentInfo.userID,
              email: agentInfo.email,
            }),
            new CommunityMemberClaim({
              communityID: community.id,
              communityDisplayName: community.displayName,
            }),
          ],
        },
      ]
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description:
      'Creates feedback on community context from users having COMMUNITY_CONTEXT_REVIEW privilege',
  })
  @Profiling.api
  async createFeedbackOnCommunityContext(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('feedbackData') feedbackData: CreateFeedbackOnCommunityContextInput
  ): Promise<boolean> {
    const community = await this.communityService.getCommunityOrFail(
      feedbackData.communityID
    );

    // todo: must check COMMUNITY_CONTEXT_REVIEW on Challenge
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.COMMUNITY_CONTEXT_REVIEW,
      `creating feedback on community: ${community.id}`
    );

    const payload =
      await this.notificationsPayloadBuilder.buildCommunityContextReviewSubmittedNotificationPayload(
        agentInfo.userID,
        feedbackData.communityID,
        community.parentID,
        feedbackData.questions
      );
    this.notificationsClient.emit(
      EventType.COMMUNITY_CONTEXT_REVIEW_SUBMITTED,
      payload
    );

    return true;
  }
}
