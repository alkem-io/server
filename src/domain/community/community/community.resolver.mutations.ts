import { Inject, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IUserGroup } from '@domain/community/user-group';
import { CommunityService } from './community.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IApplication } from '@domain/community/application';
import { ApplicationService } from '@domain/community/application/application.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunityApplicationLifecycleOptionsProvider } from './community.lifecycle.application.options.provider';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from '@domain/community/user/user.service';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { UserAuthorizationService } from '../user/user.service.authorization';
import { AssignCommunityMemberUserInput } from './dto/community.dto.assign.member.user';
import { RemoveCommunityMemberUserInput } from './dto/community.dto.remove.member.user';
import { ApplicationEventInput } from '../application/dto/application.dto.event';
import { ApplicationAuthorizationService } from '../application/application.service.authorization';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CommunityJoinInput } from './dto/community.dto.join';
import { CommunityApplyInput } from './dto/community.dto.apply';
import { CommunityMemberClaim } from '@services/external/trust-registry/trust.registry.claim/claim.community.member';
import { AgentBeginVerifiedCredentialOfferOutput } from '@domain/agent/agent/dto/agent.dto.verified.credential.offer.begin.output';
import { AlkemioUserClaim } from '@services/external/trust-registry/trust.registry.claim/claim.alkemio.user';
import { CreateFeedbackOnCommunityContextInput } from '@domain/community/community/dto/community.dto.create.feedback.on.context';
import { CreateUserGroupInput } from '../user-group/dto';
import { AssignCommunityMemberOrganizationInput } from './dto/community.dto.assign.member.organization';
import { RemoveCommunityMemberOrganizationInput } from './dto/community.dto.remove.member.organization';
import { AssignCommunityLeadOrganizationInput } from './dto/community.dto.assign.lead.organization';
import { RemoveCommunityLeadOrganizationInput } from './dto/community.dto.remove.lead.organization';
import { RemoveCommunityLeadUserInput } from './dto/community.dto.remove.lead.user';
import { CommunityRole } from '@common/enums/community.role';
import { AssignCommunityLeadUserInput } from './dto/community.dto.assign.lead.user';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputCommunityApplication } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.application';
import { NotificationInputCommunityNewMember } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.new.member';
import { NotificationInputCommunityContextReview } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.context.review';
import { CommunityAuthorizationService } from './community.service.authorization';
import { CommunityType } from '@common/enums/community.type';
import { ElasticsearchService } from '@services/external/elasticsearch';
import { UpdateCommunityApplicationFormInput } from './dto/community.dto.update.application.form';
import { InvitationAuthorizationService } from '../invitation/invitation.service.authorization';
import { InvitationService } from '../invitation/invitation.service';
import { NotificationInputCommunityInvitation } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.invitation';
import { InvitationEventInput } from '../invitation/dto/invitation.dto.event';
import { CommunityInvitationLifecycleOptionsProvider } from './community.lifecycle.invitation.options.provider';
import { IInvitation } from '../invitation';
import { CreateInvitationExistingUserOnCommunityInput } from './dto/community.dto.invite.existing.user';
import { CreateInvitationExternalUserOnCommunityInput } from './dto/community.dto.invite.external.user';
import { InvitationExternalAuthorizationService } from '../invitation.external/invitation.external.service.authorization';
import { IInvitationExternal } from '../invitation.external';

@Resolver()
export class CommunityResolverMutations {
  constructor(
    private elasticService: ElasticsearchService,
    private authorizationService: AuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private userGroupAuthorizationService: UserGroupAuthorizationService,
    private communityService: CommunityService,
    @Inject(CommunityApplicationLifecycleOptionsProvider)
    private communityLifecycleApplicationOptionsProvider: CommunityApplicationLifecycleOptionsProvider,
    private communityLifecycleInvitationOptionsProvider: CommunityInvitationLifecycleOptionsProvider,
    private applicationService: ApplicationService,
    private agentService: AgentService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    private invitationService: InvitationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private invitationExternalAuthorizationService: InvitationExternalAuthorizationService,
    private communityAuthorizationService: CommunityAuthorizationService
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
  async assignUserAsCommunityMember(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: AssignCommunityMemberUserInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      membershipData.communityID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.COMMUNITY_ADD_MEMBER,
      `assign user community: ${community.displayName}`
    );
    await this.communityService.assignUserToRole(
      community,
      membershipData.userID,
      CommunityRole.MEMBER,
      agentInfo
    );

    // reset the user authorization policy so that their profile is visible to other community members
    const user = await this.userService.getUserOrFail(membershipData.userID);
    await this.userAuthorizationService.applyAuthorizationPolicy(user);

    return community;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description: 'Assigns a User as a lead of the specified Community.',
  })
  @Profiling.api
  async assignUserAsCommunityLead(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('leadershipData') leadershipData: AssignCommunityLeadUserInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      leadershipData.communityID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.GRANT,
      `assign user community: ${community.displayName}`
    );
    await this.communityService.assignUserToRole(
      community,
      leadershipData.userID,
      CommunityRole.LEAD,
      agentInfo
    );

    // reset the user authorization policy so that their profile is visible to other community members
    const user = await this.userService.getUserOrFail(leadershipData.userID);
    await this.userAuthorizationService.applyAuthorizationPolicy(user);

    return community;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description:
      'Assigns an Organization as a member of the specified Community.',
  })
  @Profiling.api
  async assignOrganizationAsCommunityMember(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData')
    membershipData: AssignCommunityMemberOrganizationInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      membershipData.communityID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.GRANT,
      `assign organization community member: ${community.displayName}`
    );
    return await this.communityService.assignOrganizationToRole(
      community,
      membershipData.organizationID,
      CommunityRole.MEMBER
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description:
      'Assigns an Organization as a Lead of the specified Community.',
  })
  @Profiling.api
  async assignOrganizationAsCommunityLead(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('leadershipData')
    leadershipData: AssignCommunityLeadOrganizationInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      leadershipData.communityID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.GRANT,
      `assign organization community lead: ${community.displayName}`
    );
    return await this.communityService.assignOrganizationToRole(
      community,
      leadershipData.organizationID,
      CommunityRole.LEAD
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description: 'Removes a User as a member of the specified Community.',
  })
  @Profiling.api
  async removeUserAsCommunityMember(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData') membershipData: RemoveCommunityMemberUserInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      membershipData.communityID
    );

    // Extend the authorization policy with a credential rule to assign the GRANT privilege
    // to the user specified in the incoming mutation. Then if it is the same user as is logged
    // in then the user will have the GRANT privilege + so can carry out the mutation
    const extendedAuthorization =
      this.communityAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
        community,
        membershipData.userID
      );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.GRANT,
      `remove user from community: ${community.displayName}`
    );

    await this.communityService.removeUserFromRole(
      community,
      membershipData.userID,
      CommunityRole.MEMBER
    );
    // reset the user authorization policy so that their profile is not visible
    // to other community members
    const user = await this.userService.getUserOrFail(membershipData.userID);
    await this.userAuthorizationService.applyAuthorizationPolicy(user);
    return community;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description: 'Removes a User as a Lead of the specified Community.',
  })
  @Profiling.api
  async removeUserAsCommunityLead(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('leadershipData') leadershipData: RemoveCommunityLeadUserInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      leadershipData.communityID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.GRANT,
      `remove user from community lead: ${community.displayName}`
    );

    return await this.communityService.removeUserFromRole(
      community,
      leadershipData.userID,
      CommunityRole.LEAD
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description:
      'Removes an Organization as a member of the specified Community.',
  })
  @Profiling.api
  async removeOrganizationAsCommunityMember(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('membershipData')
    membershipData: RemoveCommunityMemberOrganizationInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      membershipData.communityID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.GRANT,
      `remove community member organization: ${community.displayName}`
    );

    return await this.communityService.removeOrganizationFromRole(
      community,
      membershipData.organizationID,
      CommunityRole.MEMBER
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description:
      'Removes an Organization as a Lead of the specified Community.',
  })
  @Profiling.api
  async removeOrganizationAsCommunityLead(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('leadershipData')
    leadershipData: RemoveCommunityLeadOrganizationInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      leadershipData.communityID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.GRANT,
      `remove community member organization: ${community.displayName}`
    );

    return await this.communityService.removeOrganizationFromRole(
      community,
      leadershipData.organizationID,
      CommunityRole.LEAD
    );
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

    // Send the notification
    const notificationInput: NotificationInputCommunityApplication = {
      triggeredBy: agentInfo.userID,
      community: community,
    };
    await this.notificationAdapter.applicationCreated(notificationInput);

    return savedApplication;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInvitation, {
    description:
      'Invite an existing User to join the specified Community as a member.',
  })
  @Profiling.api
  async inviteExistingUserForCommunityMembership(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: CreateInvitationExistingUserOnCommunityInput
  ): Promise<IInvitation> {
    const community = await this.communityService.getCommunityOrFail(
      invitationData.communityID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.COMMUNITY_INVITE,
      `create invitation community: ${community.displayName}`
    );

    const input: CreateInvitationExistingUserOnCommunityInput = {
      communityID: community.id,
      invitedUser: invitationData.invitedUser,
      createdBy: agentInfo.userID,
    };
    const invitation = await this.communityService.createInvitationExistingUser(
      input
    );

    const savedInvitation =
      await this.invitationAuthorizationService.applyAuthorizationPolicy(
        invitation,
        community.authorization
      );

    // Send the notification
    const notificationInput: NotificationInputCommunityInvitation = {
      triggeredBy: agentInfo.userID,
      community: community,
      invitedUser: invitationData.invitedUser,
    };
    await this.notificationAdapter.invitationCreated(notificationInput);

    return savedInvitation;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInvitationExternal, {
    description:
      'Invite an external User to join the specified Community as a member.',
  })
  @Profiling.api
  async inviteExternalUserForCommunityMembership(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: CreateInvitationExternalUserOnCommunityInput
  ): Promise<IInvitationExternal> {
    const community = await this.communityService.getCommunityOrFail(
      invitationData.communityID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.COMMUNITY_INVITE,
      `create invitation external community: ${community.displayName}`
    );

    const externalInvitation =
      await this.communityService.createInvitationExternalUser(
        invitationData,
        agentInfo
      );

    const savedInvitation =
      await this.invitationExternalAuthorizationService.applyAuthorizationPolicy(
        externalInvitation,
        community.authorization
      );

    // TODO - send a relevant notification
    return savedInvitation;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => ICommunity, {
    description: 'Update the Application Form used by this Community.',
  })
  @Profiling.api
  async updateCommunityApplicationForm(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('applicationFormData')
    applicationFormData: UpdateCommunityApplicationFormInput
  ): Promise<ICommunity> {
    const community = await this.communityService.getCommunityOrFail(
      applicationFormData.communityID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.UPDATE,
      `update community application form: ${community.displayName}`
    );

    return await this.communityService.updateApplicationForm(
      community,
      applicationFormData.formData
    );
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

    // Send the notification
    const notificationInput: NotificationInputCommunityNewMember = {
      userID: agentInfo.userID,
      triggeredBy: agentInfo.userID,
      community: community,
    };
    await this.notificationAdapter.communityNewMember(notificationInput);

    const result = await this.communityService.assignUserToRole(
      community,
      agentInfo.userID,
      CommunityRole.MEMBER,
      agentInfo
    );

    switch (community.type) {
      case CommunityType.SPACE:
        this.elasticService.spaceJoined(
          {
            id: community.parentID,
            name: community.displayName,
            space: community.spaceID,
          },
          {
            id: agentInfo.userID,
            email: agentInfo.email,
          }
        );
        break;
      case CommunityType.CHALLENGE:
        this.elasticService.challengeJoined(
          {
            id: community.parentID,
            name: community.displayName,
            space: community.spaceID,
          },
          {
            id: agentInfo.userID,
            email: agentInfo.email,
          }
        );
        break;
      case CommunityType.OPPORTUNITY:
        this.elasticService.opportunityJoined(
          {
            id: community.parentID,
            name: community.displayName,
            space: community.spaceID,
          },
          {
            id: agentInfo.userID,
            email: agentInfo.email,
          }
        );
        break;
    }

    return result;
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
    return await this.communityLifecycleApplicationOptionsProvider.eventOnApplication(
      applicationEventData,
      agentInfo
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IApplication, {
    description: 'Trigger an event on the Invitation.',
  })
  async eventOnCommunityInvitation(
    @Args('invitationEventData')
    invitationEventData: InvitationEventInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IApplication> {
    const invitation = await this.invitationService.getInvitationOrFail(
      invitationEventData.invitationID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      invitation.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on invitation: ${invitation.id}`
    );
    return await this.communityLifecycleInvitationOptionsProvider.eventOnInvitation(
      invitationEventData,
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

    // Send the notification
    const notificationInput: NotificationInputCommunityContextReview = {
      triggeredBy: agentInfo.userID,
      community: community,
      questions: feedbackData.questions,
    };
    await this.notificationAdapter.communityContextReview(notificationInput);

    return true;
  }
}
