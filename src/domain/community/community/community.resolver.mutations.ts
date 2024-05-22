import { Inject, UseGuards } from '@nestjs/common';
import { Args, createUnionType, Mutation, Resolver } from '@nestjs/graphql';
import { IUserGroup } from '@domain/community/user-group';
import { CommunityService } from './community.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IApplication } from '@domain/community/application';
import { ApplicationService } from '@domain/community/application/application.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { CommunityApplicationLifecycleOptionsProvider } from './community.lifecycle.application.options.provider';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from '@domain/community/user/user.service';
import { UserGroupAuthorizationService } from '../user-group/user-group.service.authorization';
import { UserAuthorizationService } from '../user/user.service.authorization';
import { RemoveCommunityRoleFromUserInput } from './dto/community.dto.role.remove.user';
import { ApplicationEventInput } from '../application/dto/application.dto.event';
import { ApplicationAuthorizationService } from '../application/application.service.authorization';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CommunityJoinInput } from './dto/community.dto.join';
import { CommunityApplyInput } from './dto/community.dto.apply';
import { CommunityMemberClaim } from '@services/external/trust-registry/trust.registry.claim/claim.community.member';
import { AgentBeginVerifiedCredentialOfferOutput } from '@domain/agent/agent/dto/agent.dto.verified.credential.offer.begin.output';
import { AlkemioUserClaim } from '@services/external/trust-registry/trust.registry.claim/claim.alkemio.user';
import { CreateUserGroupInput } from '../user-group/dto';
import { RemoveCommunityRoleFromOrganizationInput } from './dto/community.dto.role.remove.organization';
import { AssignCommunityRoleToOrganizationInput } from './dto/community.dto.role.assign.organization';
import { CommunityRole } from '@common/enums/community.role';
import { AssignCommunityRoleToUserInput } from './dto/community.dto.role.assign.user';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputCommunityApplication } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.application';
import { CommunityAuthorizationService } from './community.service.authorization';
import { UpdateCommunityApplicationFormInput } from './dto/community.dto.update.application.form';
import { InvitationAuthorizationService } from '../invitation/invitation.service.authorization';
import { InvitationService } from '../invitation/invitation.service';
import { NotificationInputCommunityInvitation } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.invitation';
import { InvitationEventInput } from '../invitation/dto/invitation.dto.event';
import { CommunityInvitationLifecycleOptionsProvider } from './community.lifecycle.invitation.options.provider';
import { CreateInvitationInput, IInvitation } from '../invitation';
import { CreateInvitationForUsersOnCommunityInput } from './dto/community.dto.invite.existing.user';
import { IOrganization } from '../organization';
import { IUser } from '../user/user.interface';
import { CreateInvitationUserByEmailOnCommunityInput } from './dto/community.dto.invite.external.user';
import { InvitationExternalAuthorizationService } from '../invitation.external/invitation.external.service.authorization';
import { IInvitationExternal } from '../invitation.external';
import { NotificationInputCommunityInvitationExternal } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.invitation.external';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { CommunityMembershipException } from '@common/exceptions/community.membership.exception';
import { AssignCommunityRoleToVirtualInput } from './dto/community.dto.role.assign.virtual';
import { RemoveCommunityRoleFromVirtualInput } from './dto/community.dto.role.remove.virtual';
import { VirtualContributorAuthorizationService } from '../virtual-contributor/virtual.contributor.service.authorization';
import { VirtualContributorService } from '../virtual-contributor/virtual.contributor.service';
import { IVirtualContributor } from '../virtual-contributor';
import { EntityNotInitializedException } from '@common/exceptions';
import { CommunityInvitationException } from '@common/exceptions/community.invitation.exception';
import { EventBus } from '@nestjs/cqrs';
import {
  IngestSpace,
  SpaceIngestionPurpose,
} from '@services/infrastructure/event-bus/commands';

const IAnyInvitation = createUnionType({
  name: 'AnyInvitation',
  types: () => [IInvitation, IInvitationExternal],
  resolveType(value: IInvitation | IInvitationExternal) {
    if ('user' in value) {
      return IInvitation;
    }
    return IInvitationExternal;
  },
});

@Resolver()
export class CommunityResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private virtualContributorService: VirtualContributorService,
    private virtualContributorAuthorizationService: VirtualContributorAuthorizationService,
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
    private communityAuthorizationService: CommunityAuthorizationService,
    private eventBus: EventBus
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
      `create group community: ${community.id}`
    );
    const group = await this.communityService.createGroup(groupData);
    return await this.userGroupAuthorizationService.applyAuthorizationPolicy(
      group,
      community.authorization
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User to a role in the specified Community.',
  })
  @Profiling.api
  async assignCommunityRoleToUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: AssignCommunityRoleToUserInput
  ): Promise<IUser> {
    const community = await this.communityService.getCommunityOrFail(
      roleData.communityID
    );

    let requiredPrivilege = AuthorizationPrivilege.GRANT;
    if (roleData.role === CommunityRole.MEMBER) {
      requiredPrivilege = AuthorizationPrivilege.COMMUNITY_ADD_MEMBER;
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      requiredPrivilege,
      `assign user community role: ${community.id}`
    );

    await this.communityService.assignUserToRole(
      community,
      roleData.userID,
      roleData.role,
      agentInfo,
      true
    );

    // reset the user authorization policy so that their profile is visible to other community members
    const user = await this.userService.getUserOrFail(roleData.userID);
    return await this.userAuthorizationService.applyAuthorizationPolicy(user);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description: 'Assigns an Organization a Role in the specified Community.',
  })
  @Profiling.api
  async assignCommunityRoleToOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData')
    roleData: AssignCommunityRoleToOrganizationInput
  ): Promise<IOrganization> {
    const community = await this.communityService.getCommunityOrFail(
      roleData.communityID
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.GRANT,
      `assign organization community role: ${community.id}`
    );
    return await this.communityService.assignOrganizationToRole(
      community,
      roleData.organizationID,
      roleData.role
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description:
      'Assigns a Virtual Contributor to a role in the specified Community.',
  })
  @Profiling.api
  async assignCommunityRoleToVirtual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: AssignCommunityRoleToVirtualInput
  ): Promise<IVirtualContributor> {
    const community = await this.communityService.getCommunityOrFail(
      roleData.communityID
    );

    let requiredPrivilege = AuthorizationPrivilege.GRANT;
    if (roleData.role === CommunityRole.MEMBER) {
      requiredPrivilege = AuthorizationPrivilege.COMMUNITY_ADD_MEMBER;
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      requiredPrivilege,
      `assign virtual community role: ${community.id}`
    );

    // Also require ACCESS_VIRTUAL_CONTRIBUTORS to assign a virtual contributor
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.ACCESS_VIRTUAL_CONTRIBUTOR,
      `assign virtual community role VC privilege: ${community.id}`
    );

    await this.communityService.assignVirtualToRole(
      community,
      roleData.virtualContributorID,
      roleData.role
    );

    // reset the user authorization policy so that their profile is visible to other community members
    let virtual =
      await this.virtualContributorService.getVirtualContributorOrFail(
        roleData.virtualContributorID,
        {
          relations: {
            account: true,
          },
        }
      );

    virtual =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        virtual,
        virtual.account.authorization
      );
    await this.virtualContributorService.save(virtual);

    // publish to EB for space ingestion
    const spaceID = await this.communityService.getRootSpaceID(community);
    // we are publising an event instead of executing a command because Nest's CQRS
    // won't execute a command unless a command handler is defined within the application
    // we want to have an external handler so for now events will do
    this.eventBus.publish(
      new IngestSpace(spaceID, SpaceIngestionPurpose.Context)
    );

    return virtual;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from a Role in the specified Community.',
  })
  @Profiling.api
  async removeCommunityRoleFromUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: RemoveCommunityRoleFromUserInput
  ): Promise<IUser> {
    const community = await this.communityService.getCommunityOrFail(
      roleData.communityID
    );

    // Extend the authorization policy with a credential rule to assign the GRANT privilege
    // to the user specified in the incoming mutation. Then if it is the same user as is logged
    // in then the user will have the GRANT privilege + so can carry out the mutation
    const extendedAuthorization =
      this.communityAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
        community,
        roleData.userID
      );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.GRANT,
      `remove user from community role: ${community.id}`
    );

    await this.communityService.removeUserFromRole(
      community,
      roleData.userID,
      roleData.role
    );
    // reset the user authorization policy so that their profile is not visible
    // to other community members
    const user = await this.userService.getUserOrFail(roleData.userID);
    return await this.userAuthorizationService.applyAuthorizationPolicy(user);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description:
      'Removes an Organization from a Role in the specified Community.',
  })
  @Profiling.api
  async removeCommunityRoleFromOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: RemoveCommunityRoleFromOrganizationInput
  ): Promise<IOrganization> {
    const community = await this.communityService.getCommunityOrFail(
      roleData.communityID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.GRANT,
      `remove community role organization: ${community.id}`
    );

    return await this.communityService.removeOrganizationFromRole(
      community,
      roleData.organizationID,
      roleData.role
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Removes a Virtual from a Role in the specified Community.',
  })
  @Profiling.api
  async removeCommunityRoleFromVirtual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: RemoveCommunityRoleFromVirtualInput
  ): Promise<IVirtualContributor> {
    const community = await this.communityService.getCommunityOrFail(
      roleData.communityID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.GRANT,
      `remove virtual from community role: ${community.id}`
    );

    await this.communityService.removeVirtualFromRole(
      community,
      roleData.virtualContributorID,
      roleData.role
    );
    // reset the user authorization policy so that their profile is not visible
    // to other community members
    let virtual =
      await this.virtualContributorService.getVirtualContributorOrFail(
        roleData.virtualContributorID,
        {
          relations: {
            account: true,
          },
        }
      );
    virtual =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        virtual,
        virtual.account.authorization
      );
    return await this.virtualContributorService.save(virtual);
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
      `create application community: ${community.id}`
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
  @Mutation(() => [IInvitation], {
    description:
      'Invite an existing User to join the specified Community as a member.',
  })
  @Profiling.api
  async inviteExistingUserForCommunityMembership(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: CreateInvitationForUsersOnCommunityInput
  ): Promise<IInvitation[]> {
    const community = await this.communityService.getCommunityOrFail(
      invitationData.communityID,
      {
        relations: {
          parentCommunity: {
            authorization: true,
          },
        },
      }
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.COMMUNITY_INVITE,
      `create invitation community: ${community.id}`
    );

    const users: IUser[] = [];
    for (const userID of invitationData.invitedUsers) {
      const user = await this.userService.getUserOrFail(userID, {
        relations: {
          agent: true,
        },
      });
      users.push(user);
    }

    // Logic is that the ability to invite to a subspace requires the ability to invite to the
    // parent community if the user is not a member there
    if (community.parentCommunity) {
      const parentCommunityAuthorization =
        community.parentCommunity.authorization;
      const canInviteToParent = this.authorizationService.isAccessGranted(
        agentInfo,
        parentCommunityAuthorization,
        AuthorizationPrivilege.COMMUNITY_INVITE
      );

      // Need to see if also can invite to the parent community if any of the users are not members there
      for (const user of users) {
        if (!user.agent) {
          throw new EntityNotInitializedException(
            `Unable to load agent on user: ${user.id}`,
            LogContext.COMMUNITY
          );
        }
        const isMember = await this.communityService.isMember(
          user.agent,
          community.parentCommunity
        );
        if (!isMember && !canInviteToParent) {
          throw new CommunityInvitationException(
            `User is not a member of the parent community (${community.parentCommunity.id}) and the current user does not have the privilege to invite to the parent community`,
            LogContext.COMMUNITY
          );
        } else {
          invitationData.invitedToParent = true;
        }
      }
    } else {
      invitationData.invitedToParent = false;
    }

    return Promise.all(
      users.map(async invitedUser => {
        return await this.inviteSingleExistingUser(
          community,
          invitedUser,
          agentInfo,
          invitationData.invitedToParent,
          invitationData.welcomeMessage
        );
      })
    );
  }

  private async inviteSingleExistingUser(
    community: ICommunity,
    invitedUser: IUser,
    agentInfo: AgentInfo,
    invitedToParent: boolean,
    welcomeMessage?: string
  ): Promise<IInvitation> {
    const input: CreateInvitationInput = {
      communityID: community.id,
      invitedUser: invitedUser.id,
      createdBy: agentInfo.userID,
      invitedToParent,
      welcomeMessage,
    };

    let invitation = await this.communityService.createInvitationExistingUser(
      input
    );

    invitation =
      await this.invitationAuthorizationService.applyAuthorizationPolicy(
        invitation,
        community.authorization
      );

    // Send the notification
    const notificationInput: NotificationInputCommunityInvitation = {
      triggeredBy: agentInfo.userID,
      community: community,
      invitedUser: invitedUser.id,
    };

    await this.notificationAdapter.invitationCreated(notificationInput);

    return invitation;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAnyInvitation, {
    description:
      'Invite an external User to join the specified Community as a member.',
  })
  @Profiling.api
  async inviteForCommunityMembershipByEmail(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: CreateInvitationUserByEmailOnCommunityInput
  ): Promise<IInvitation | IInvitationExternal> {
    const community = await this.communityService.getCommunityOrFail(
      invitationData.communityID,
      {
        relations: {
          parentCommunity: {
            authorization: true,
          },
        },
      }
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.COMMUNITY_INVITE,
      `create invitation external community: ${community.id}`
    );

    const existingUser = await this.userService.getUserByEmail(
      invitationData.email,
      {
        relations: {
          agent: true,
        },
      }
    );

    // Logic is that the ability to invite to a subspace requires the ability to invite to the
    // parent community if the user is not a member there
    if (community.parentCommunity) {
      const parentCommunityAuthorization =
        community.parentCommunity.authorization;
      const canInviteToParent = this.authorizationService.isAccessGranted(
        agentInfo,
        parentCommunityAuthorization,
        AuthorizationPrivilege.COMMUNITY_INVITE
      );
      if (existingUser !== null) {
        // Need to see if also can invite to the parent community if any of the users are not members there
        if (!existingUser.agent) {
          throw new EntityNotInitializedException(
            `Unable to load agent on user: ${existingUser.id}`,
            LogContext.COMMUNITY
          );
        }
        const isMember = await this.communityService.isMember(
          existingUser.agent,
          community.parentCommunity
        );
        if (!isMember && !canInviteToParent) {
          throw new CommunityInvitationException(
            `User is not a member of the parent community (${community.parentCommunity.id}) and the current user does not have the privilege to invite to the parent community`,
            LogContext.COMMUNITY
          );
        } else {
        }
      } else {
        if (!canInviteToParent) {
          throw new CommunityInvitationException(
            `New external user (${invitationData.email}) and the current user (${agentInfo.email}) does not have the privilege to invite to the parent community: ${community.parentCommunity.id}`,
            LogContext.COMMUNITY
          );
        }
      }
    }

    if (existingUser) {
      return this.inviteSingleExistingUser(
        community,
        existingUser,
        agentInfo,
        invitationData.invitedToParent,
        invitationData.welcomeMessage
      );
    }

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

    const notificationInput: NotificationInputCommunityInvitationExternal = {
      triggeredBy: agentInfo.userID,
      community: community,
      invitedUser: invitationData.email,
      welcomeMessage: invitationData.welcomeMessage,
    };
    await this.notificationAdapter.externalInvitationCreated(notificationInput);
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
      `update community application form: ${community.id}`
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
    const membershipStatus = await this.communityService.getMembershipStatus(
      agentInfo,
      community
    );
    if (membershipStatus === CommunityMembershipStatus.INVITATION_PENDING) {
      throw new CommunityMembershipException(
        `Unable to join Community (${community.id}): invitation to join is pending.`,
        LogContext.COMMUNITY
      );
    }

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.COMMUNITY_JOIN,
      `join community: ${community.id}`
    );

    await this.communityService.assignUserToRole(
      community,
      agentInfo.userID,
      CommunityRole.MEMBER,
      agentInfo,
      true
    );

    return community;
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
  @Mutation(() => IInvitation, {
    description: 'Trigger an event on the Invitation.',
  })
  async eventOnCommunityInvitation(
    @Args('invitationEventData')
    invitationEventData: InvitationEventInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IInvitation> {
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
              communityDisplayName: community.id,
            }),
          ],
        },
      ]
    );
  }
}
