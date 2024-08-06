import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { IApplication } from '@domain/community/application';
import { ApplicationService } from '@domain/community/application/application.service';
import { ICommunity } from '@domain/community/community/community.interface';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '../user/user.service.authorization';
import { RemoveCommunityRoleFromUserInput } from './dto/community.role.dto.role.remove.user';
import { ApplicationEventInput } from '../application/dto/application.dto.event';
import { ApplicationAuthorizationService } from '../application/application.service.authorization';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CommunityJoinInput } from './dto/community.role.dto.join';
import { CommunityRoleApplyInput } from './dto/community.role.dto.apply';
import { CommunityMemberClaim } from '@services/external/trust-registry/trust.registry.claim/claim.community.member';
import { AgentBeginVerifiedCredentialOfferOutput } from '@domain/agent/agent/dto/agent.dto.verified.credential.offer.begin.output';
import { AlkemioUserClaim } from '@services/external/trust-registry/trust.registry.claim/claim.alkemio.user';
import { RemoveCommunityRoleFromOrganizationInput } from './dto/community.role.dto.role.remove.organization';
import { AssignCommunityRoleToOrganizationInput } from './dto/community.role.dto.role.assign.organization';
import { CommunityRole } from '@common/enums/community.role';
import { AssignCommunityRoleToUserInput } from './dto/community.role.dto.role.assign.user';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { NotificationInputCommunityApplication } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.application';
import { InvitationAuthorizationService } from '../invitation/invitation.service.authorization';
import { InvitationService } from '../invitation/invitation.service';
import { NotificationInputCommunityInvitation } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.invitation';
import { InvitationEventInput } from '../invitation/dto/invitation.dto.event';
import { CreateInvitationInput, IInvitation } from '../invitation';
import { IOrganization } from '../organization';
import { IUser } from '../user/user.interface';
import { CreatePlatformInvitationOnCommunityInput } from './dto/community.role.dto.platform.invitation.community';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { CommunityMembershipException } from '@common/exceptions/community.membership.exception';
import { AssignCommunityRoleToVirtualInput } from './dto/community.role.dto.role.assign.virtual';
import { RemoveCommunityRoleFromVirtualInput } from './dto/community.role.dto.role.remove.virtual';
import { VirtualContributorService } from '../virtual-contributor/virtual.contributor.service';
import { VirtualContributor } from '../virtual-contributor/virtual.contributor.entity';
import { EntityNotInitializedException } from '@common/exceptions';
import { CommunityInvitationException } from '@common/exceptions/community.invitation.exception';
import { CreateInvitationForContributorsOnCommunityInput } from './dto/community.role.dto.invite.contributor';
import { IContributor } from '../contributor/contributor.interface';
import { ContributorService } from '../contributor/contributor.service';
import { PlatformInvitationAuthorizationService } from '@platform/invitation/platform.invitation.service.authorization';
import { PlatformInvitationService } from '@platform/invitation/platform.invitation.service';
import { IPlatformInvitation } from '@platform/invitation';
import { NotificationInputPlatformInvitation } from '@services/adapters/notification-adapter/dto/notification.dto.input.platform.invitation';
import { NotificationInputCommunityInvitationVirtualContributor } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.invitation.vc';
import { CommunityRoleService } from './community.role.service';
import { CommunityService } from '../community/community.service';
import { CommunityAuthorizationService } from '../community/community.service.authorization';
import { CommunityRoleInvitationLifecycleOptionsProvider } from './community.role.lifecycle.invitation.options.provider';
import { CommunityRoleApplicationLifecycleOptionsProvider } from './community.role.lifecycle.application.options.provider';
import { IVirtualContributor } from '../virtual-contributor/virtual.contributor.interface';

@Resolver()
export class CommunityRoleResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private notificationAdapter: NotificationAdapter,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private virtualContributorService: VirtualContributorService,
    private communityRoleService: CommunityRoleService,
    private communityService: CommunityService,
    private communityAuthorizationService: CommunityAuthorizationService,
    private communityLifecycleApplicationOptionsProvider: CommunityRoleApplicationLifecycleOptionsProvider,
    private communityLifecycleInvitationOptionsProvider: CommunityRoleInvitationLifecycleOptionsProvider,
    private applicationService: ApplicationService,
    private agentService: AgentService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    private invitationService: InvitationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private contributorService: ContributorService,
    private platformInvitationAuthorizationService: PlatformInvitationAuthorizationService,
    private platformInvitationService: PlatformInvitationService
  ) {}

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

    await this.communityRoleService.assignUserToRole(
      community,
      roleData.userID,
      roleData.role,
      agentInfo,
      true
    );

    // reset the user authorization policy so that their profile is visible to other community members
    let user = await this.userService.getUserOrFail(roleData.userID);
    user = await this.userAuthorizationService.applyAuthorizationPolicy(user);
    return await this.userService.save(user);
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
    return await this.communityRoleService.assignOrganizationToRole(
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
      const sameAccount =
        await this.communityRoleService.isCommunityAccountMatchingVcAccount(
          community.id,
          roleData.virtualContributorID
        );
      if (sameAccount) {
        requiredPrivilege =
          AuthorizationPrivilege.COMMUNITY_ADD_MEMBER_VC_FROM_ACCOUNT;
      } else {
        requiredPrivilege = AuthorizationPrivilege.COMMUNITY_ADD_MEMBER;
      }
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

    await this.communityRoleService.assignVirtualToRole(
      community,
      roleData.virtualContributorID,
      roleData.role,
      agentInfo,
      true
    );

    return await this.virtualContributorService.getVirtualContributorOrFail(
      roleData.virtualContributorID
    );
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

    await this.communityRoleService.removeUserFromRole(
      community,
      roleData.userID,
      roleData.role
    );
    // reset the user authorization policy so that their profile is not visible
    // to other community members
    let user = await this.userService.getUserOrFail(roleData.userID);
    user = await this.userAuthorizationService.applyAuthorizationPolicy(user);
    return await this.userService.save(user);
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

    return await this.communityRoleService.removeOrganizationFromRole(
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

    // Extend the authorization policy with a credential rule to assign the GRANT privilege
    // to the user with rights around the incoming virtual being removed.
    //. Then if it is the user that is logged in then the user will have the GRANT privilege + so can carry out the mutation
    const extendedAuthorization =
      await this.communityAuthorizationService.extendAuthorizationPolicyForVirtualContributorRemoval(
        community,
        roleData.virtualContributorID
      );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.GRANT,
      `remove virtual from community role: ${community.id}`
    );

    await this.communityRoleService.removeVirtualFromRole(
      community,
      roleData.virtualContributorID,
      roleData.role
    );

    return await this.virtualContributorService.getVirtualContributorOrFail(
      roleData.virtualContributorID
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IApplication, {
    description: 'Apply to join the specified Community as a member.',
  })
  @Profiling.api
  async applyForCommunityMembership(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('applicationData') applicationData: CommunityRoleApplyInput
  ): Promise<IApplication> {
    const community = await this.communityService.getCommunityOrFail(
      applicationData.communityID,
      {
        relations: {
          parentCommunity: true,
        },
      }
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.COMMUNITY_APPLY,
      `create application community: ${community.id}`
    );

    if (community.parentCommunity) {
      const { agent } = await this.userService.getUserAndAgent(
        agentInfo.userID
      );
      const userIsMemberInParent = await this.communityRoleService.isInRole(
        agent,
        community.parentCommunity,
        CommunityRole.MEMBER
      );
      if (!userIsMemberInParent) {
        throw new CommunityMembershipException(
          `Unable to apply for Community (${community.id}): user is not a member of the parent Community`,
          LogContext.COMMUNITY
        );
      }
    }

    let application = await this.communityRoleService.createApplication({
      parentID: community.id,
      questions: applicationData.questions,
      userID: agentInfo.userID,
    });

    application =
      await this.applicationAuthorizationService.applyAuthorizationPolicy(
        application,
        community.authorization
      );
    application = await this.applicationService.save(application);

    // Send the notification
    const notificationInput: NotificationInputCommunityApplication = {
      triggeredBy: agentInfo.userID,
      community: community,
    };
    await this.notificationAdapter.applicationCreated(notificationInput);

    return application;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => [IInvitation], {
    description:
      'Invite an existing Contriburor to join the specified Community as a member.',
  })
  @Profiling.api
  async inviteContributorsForCommunityMembership(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: CreateInvitationForContributorsOnCommunityInput
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
    if (invitationData.invitedContributors.length === 0) {
      throw new CommunityInvitationException(
        `No contributors were provided to invite: ${community.id}`,
        LogContext.COMMUNITY
      );
    }

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      community.authorization,
      AuthorizationPrivilege.COMMUNITY_INVITE,
      `create invitation community: ${community.id}`
    );

    const contributors: IContributor[] = [];
    for (const contributorID of invitationData.invitedContributors) {
      const contributor =
        await this.contributorService.getContributorByUuidOrFail(
          contributorID,
          {
            relations: {
              agent: true,
            },
          }
        );
      contributors.push(contributor);
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
      for (const contributor of contributors) {
        if (!contributor.agent) {
          throw new EntityNotInitializedException(
            `Unable to load agent on contributor: ${contributor.id}`,
            LogContext.COMMUNITY
          );
        }
        const isMember = await this.communityRoleService.isMember(
          contributor.agent,
          community.parentCommunity
        );
        if (!isMember && !canInviteToParent) {
          throw new CommunityInvitationException(
            `Contributor is not a member of the parent community (${community.parentCommunity.id}) and the current user does not have the privilege to invite to the parent community`,
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
      contributors.map(async invitedContributor => {
        return await this.inviteSingleExistingContributor(
          community,
          invitedContributor,
          agentInfo,
          invitationData.invitedToParent,
          invitationData.welcomeMessage
        );
      })
    );
  }

  private async inviteSingleExistingContributor(
    community: ICommunity,
    invitedContributor: IContributor,
    agentInfo: AgentInfo,
    invitedToParent: boolean,
    welcomeMessage?: string
  ): Promise<IInvitation> {
    const input: CreateInvitationInput = {
      communityID: community.id,
      invitedContributor: invitedContributor.id,
      createdBy: agentInfo.userID,
      invitedToParent,
      welcomeMessage,
    };

    let invitation =
      await this.communityRoleService.createInvitationExistingContributor(
        input
      );

    invitation =
      await this.invitationAuthorizationService.applyAuthorizationPolicy(
        invitation,
        community.authorization
      );
    invitation = await this.invitationService.save(invitation);

    if (invitedContributor instanceof VirtualContributor) {
      const accountHost =
        await this.virtualContributorService.getAccountHost(invitedContributor);
      const notificationInput: NotificationInputCommunityInvitationVirtualContributor =
        {
          triggeredBy: agentInfo.userID,
          community: community,
          invitedContributorID: invitedContributor.id,
          accountHost: accountHost,
          welcomeMessage,
        };

      await this.notificationAdapter.invitationVirtualContributorCreated(
        notificationInput
      );
    } else {
      // Send the notification
      const notificationInput: NotificationInputCommunityInvitation = {
        triggeredBy: agentInfo.userID,
        community: community,
        invitedContributorID: invitedContributor.id,
        welcomeMessage,
      };

      await this.notificationAdapter.invitationCreated(notificationInput);
    }

    return invitation;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPlatformInvitation, {
    description:
      'Invite a User to join the platform and the specified Community as a member.',
  })
  @Profiling.api
  async inviteUserToPlatformAndCommunity(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: CreatePlatformInvitationOnCommunityInput
  ): Promise<IPlatformInvitation> {
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

    if (existingUser) {
      throw new CommunityInvitationException(
        `User already has a profile (${existingUser.email})`,
        LogContext.COMMUNITY
      );
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

      // Not an existing user
      if (!canInviteToParent) {
        throw new CommunityInvitationException(
          `New external user (${invitationData.email}) and the current user (${agentInfo.email}) does not have the privilege to invite to the parent community: ${community.parentCommunity.id}`,
          LogContext.COMMUNITY
        );
      } else {
        invitationData.communityInvitedToParent = true;
      }
    }

    let platformInvitation =
      await this.communityRoleService.createPlatformInvitation(
        invitationData,
        agentInfo
      );

    platformInvitation =
      await this.platformInvitationAuthorizationService.applyAuthorizationPolicy(
        platformInvitation,
        community.authorization
      );
    platformInvitation =
      await this.platformInvitationService.save(platformInvitation);

    const notificationInput: NotificationInputPlatformInvitation = {
      triggeredBy: agentInfo.userID,
      community: community,
      invitedUser: invitationData.email,
      welcomeMessage: invitationData.welcomeMessage,
    };
    await this.notificationAdapter.platformInvitationCreated(notificationInput);
    return platformInvitation;
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
    const membershipStatus =
      await this.communityRoleService.getMembershipStatus(agentInfo, community);
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

    await this.communityRoleService.assignUserToRole(
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
    const community =
      await this.communityService.getCommunityOrFail(communityID);
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
