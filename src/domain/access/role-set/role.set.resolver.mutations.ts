import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RoleSetService } from './role.set.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UpdateRoleSetApplicationFormInput } from './dto/role.set.dto.update.application.form';
import { IRoleSet } from './role.set.interface';
import { IInvitation } from '../invitation/invitation.interface';
import { InvitationEventInput } from '../invitation/dto/invitation.dto.event';
import { ApplicationEventInput } from '../application/dto/application.dto.event';
import { IApplication } from '../application/application.interface';
import { CommunityRoleType } from '@common/enums/community.role';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { CommunityJoinInput } from './dto/role.set.dto.join';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { NotificationInputPlatformInvitation } from '@services/adapters/notification-adapter/dto/notification.dto.input.platform.invitation';
import { ApplicationService } from '../application/application.service';
import { ApplicationAuthorizationService } from '../application/application.service.authorization';
import { InvitationService } from '../invitation/invitation.service';
import { InvitationAuthorizationService } from '../invitation/invitation.service.authorization';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { PlatformInvitationAuthorizationService } from '@platform/invitation/platform.invitation.service.authorization';
import { VirtualContributorService } from '@domain/community/virtual-contributor/virtual.contributor.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { UserService } from '@domain/community/user/user.service';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { RoleSetApplicationLifecycleOptionsProvider } from './role.set.lifecycle.application.options.provider';
import { RoleSetInvitationLifecycleOptionsProvider } from './role.set.lifecycle.invitation.options.provider';
import { PlatformInvitationService } from '@platform/invitation/platform.invitation.service';
import { AssignCommunityRoleToUserInput } from './dto/role.set.dto.role.assign.user';
import { IUser } from '@domain/community/user/user.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { AssignCommunityRoleToOrganizationInput } from './dto/role.set.dto.role.assign.organization';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { AssignCommunityRoleToVirtualInput } from './dto/role.set.dto.role.assign.virtual';
import { RemoveCommunityRoleFromUserInput } from './dto/role.set.dto.role.remove.user';
import { RemoveCommunityRoleFromOrganizationInput } from './dto/role.set.dto.role.remove.organization';
import { RemoveCommunityRoleFromVirtualInput } from './dto/role.set.dto.role.remove.virtual';
import { CommunityRoleApplyInput } from './dto/role.set.dto.apply';
import { NotificationInputCommunityApplication } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.application';
import { CreateInvitationForContributorsOnCommunityInput } from './dto/role.set.dto.invite.contributor';
import { RoleSetInvitationException } from '@common/exceptions/role.set.invitation.exception';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { CreateInvitationInput } from '../invitation/dto/invitation.dto.create';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { NotificationInputCommunityInvitationVirtualContributor } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.invitation.vc';
import { IPlatformInvitation } from '@platform/invitation/platform.invitation.interface';
import { CreatePlatformInvitationOnCommunityInput } from './dto/role.set.dto.platform.invitation.community';
import { NotificationInputCommunityInvitation } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.invitation';
import { RoleSetAuthorizationService } from './role.set.service.authorization';

@Resolver()
export class RoleSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private roleSetService: RoleSetService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private notificationAdapter: NotificationAdapter,
    private userService: UserService,
    private userAuthorizationService: UserAuthorizationService,
    private virtualContributorService: VirtualContributorService,
    private communityResolverService: CommunityResolverService,
    private roleSetLifecycleApplicationOptionsProvider: RoleSetApplicationLifecycleOptionsProvider,
    private roleSetLifecycleInvitationOptionsProvider: RoleSetInvitationLifecycleOptionsProvider,
    private applicationService: ApplicationService,
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
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );

    let requiredPrivilege = AuthorizationPrivilege.GRANT;
    if (roleData.role === CommunityRoleType.MEMBER) {
      requiredPrivilege = AuthorizationPrivilege.COMMUNITY_ADD_MEMBER;
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      requiredPrivilege,
      `assign user community role: ${roleSet.id}`
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      roleData.role,
      roleData.userID,
      agentInfo,
      true
    );

    // reset the user authorization policy so that their profile is visible to other community members
    const user = await this.userService.getUserOrFail(roleData.userID);
    const authorizations =
      await this.userAuthorizationService.applyAuthorizationPolicy(user);
    await this.authorizationPolicyService.saveAll(authorizations);
    return await this.userService.getUserOrFail(roleData.userID);
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
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.GRANT,
      `assign organization community role: ${roleSet.id}`
    );
    return await this.roleSetService.assignOrganizationToRole(
      roleSet,
      roleData.role,
      roleData.organizationID
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
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );

    let requiredPrivilege = AuthorizationPrivilege.GRANT;
    if (roleData.role === CommunityRoleType.MEMBER) {
      const sameAccount =
        await this.roleSetService.isCommunityAccountMatchingVcAccount(
          roleSet.id,
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
      roleSet.authorization,
      requiredPrivilege,
      `assign virtual community role: ${roleSet.id}`
    );

    // Also require ACCESS_VIRTUAL_CONTRIBUTORS to assign a virtual contributor
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.ACCESS_VIRTUAL_CONTRIBUTOR,
      `assign virtual community role VC privilege: ${roleSet.id}`
    );

    await this.roleSetService.assignVirtualToRole(
      roleSet,
      roleData.role,
      roleData.virtualContributorID,
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
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );

    // Extend the authorization policy with a credential rule to assign the GRANT privilege
    // to the user specified in the incoming mutation. Then if it is the same user as is logged
    // in then the user will have the GRANT privilege + so can carry out the mutation
    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSet.id);

    const extendedAuthorization =
      this.roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
        community,
        roleData.userID
      );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.GRANT,
      `remove user from community role: ${roleSet.id}`
    );

    await this.roleSetService.removeUserFromRole(
      roleSet,
      roleData.role,
      roleData.userID
    );
    // reset the user authorization policy so that their profile is not visible
    // to other community members
    const user = await this.userService.getUserOrFail(roleData.userID);
    const authorizations =
      await this.userAuthorizationService.applyAuthorizationPolicy(user);
    await this.authorizationPolicyService.saveAll(authorizations);
    return await this.userService.getUserOrFail(roleData.userID);
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
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.GRANT,
      `remove community role organization: ${roleSet.id}`
    );

    return await this.roleSetService.removeOrganizationFromRole(
      roleSet,
      roleData.role,
      roleData.organizationID
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
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );

    // Extend the authorization policy with a credential rule to assign the GRANT privilege
    // to the user with rights around the incoming virtual being removed.
    //. Then if it is the user that is logged in then the user will have the GRANT privilege + so can carry out the mutation
    const extendedAuthorization =
      await this.roleSetAuthorizationService.extendAuthorizationPolicyForVirtualContributorRemoval(
        roleSet,
        roleData.virtualContributorID
      );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      AuthorizationPrivilege.GRANT,
      `remove virtual from community role: ${roleSet.id}`
    );

    await this.roleSetService.removeVirtualFromRole(
      roleSet,
      roleData.role,
      roleData.virtualContributorID
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
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      applicationData.roleSetID,
      {
        relations: {
          parentRoleSet: true,
        },
      }
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.COMMUNITY_APPLY,
      `create application community: ${roleSet.id}`
    );

    if (roleSet.parentRoleSet) {
      const { agent } = await this.userService.getUserAndAgent(
        agentInfo.userID
      );
      const userIsMemberInParent = await this.roleSetService.isInRole(
        agent,
        roleSet.parentRoleSet,
        CommunityRoleType.MEMBER
      );
      if (!userIsMemberInParent) {
        throw new RoleSetMembershipException(
          `Unable to apply for Community (${roleSet.id}): user is not a member of the parent Community`,
          LogContext.COMMUNITY
        );
      }
    }

    let application = await this.roleSetService.createApplication({
      roleSetID: roleSet.id,
      questions: applicationData.questions,
      userID: agentInfo.userID,
    });

    application = await this.applicationService.save(application);

    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSet.id);

    const authorization =
      await this.applicationAuthorizationService.applyAuthorizationPolicy(
        application,
        roleSet.authorization
      );
    await this.authorizationPolicyService.save(authorization);

    // Send the notification
    const notificationInput: NotificationInputCommunityApplication = {
      triggeredBy: agentInfo.userID,
      community,
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
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      invitationData.roleSetID,
      {
        relations: {
          parentRoleSet: {
            authorization: true,
          },
        },
      }
    );
    if (invitationData.invitedContributors.length === 0) {
      throw new RoleSetInvitationException(
        `No contributors were provided to invite: ${roleSet.id}`,
        LogContext.COMMUNITY
      );
    }

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.COMMUNITY_INVITE,
      `create invitation community: ${roleSet.id}`
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
    if (roleSet.parentRoleSet) {
      const parentCommunityAuthorization = roleSet.parentRoleSet.authorization;
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
        const isMember = await this.roleSetService.isMember(
          contributor.agent,
          roleSet.parentRoleSet
        );
        if (!isMember && !canInviteToParent) {
          throw new RoleSetInvitationException(
            `Contributor is not a member of the parent community (${roleSet.parentRoleSet.id}) and the current user does not have the privilege to invite to the parent community`,
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
          roleSet,
          invitedContributor,
          agentInfo,
          invitationData.invitedToParent,
          invitationData.welcomeMessage
        );
      })
    );
  }

  private async inviteSingleExistingContributor(
    roleSet: IRoleSet,
    invitedContributor: IContributor,
    agentInfo: AgentInfo,
    invitedToParent: boolean,
    welcomeMessage?: string
  ): Promise<IInvitation> {
    const input: CreateInvitationInput = {
      roleSetID: roleSet.id,
      invitedContributor: invitedContributor.id,
      createdBy: agentInfo.userID,
      invitedToParent,
      welcomeMessage,
    };

    let invitation =
      await this.roleSetService.createInvitationExistingContributor(input);

    invitation = await this.invitationService.save(invitation);

    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSet.id);

    const authorization =
      await this.invitationAuthorizationService.applyAuthorizationPolicy(
        invitation,
        roleSet.authorization
      );
    await this.authorizationPolicyService.save(authorization);

    if (invitedContributor instanceof VirtualContributor) {
      const accountProvider =
        await this.virtualContributorService.getProvider(invitedContributor);
      const notificationInput: NotificationInputCommunityInvitationVirtualContributor =
        {
          triggeredBy: agentInfo.userID,
          community,
          invitedContributorID: invitedContributor.id,
          accountHost: accountProvider,
          welcomeMessage,
        };

      await this.notificationAdapter.invitationVirtualContributorCreated(
        notificationInput
      );
    } else {
      // Send the notification
      const notificationInput: NotificationInputCommunityInvitation = {
        triggeredBy: agentInfo.userID,
        community,
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
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      invitationData.roleSetID,
      {
        relations: {
          parentRoleSet: {
            authorization: true,
          },
        },
      }
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.COMMUNITY_INVITE,
      `create invitation external community: ${roleSet.id}`
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
      throw new RoleSetInvitationException(
        `User already has a profile (${existingUser.email})`,
        LogContext.COMMUNITY
      );
    }

    // Logic is that the ability to invite to a subspace requires the ability to invite to the
    // parent community if the user is not a member there
    if (roleSet.parentRoleSet) {
      const parentCommunityAuthorization = roleSet.parentRoleSet.authorization;
      const canInviteToParent = this.authorizationService.isAccessGranted(
        agentInfo,
        parentCommunityAuthorization,
        AuthorizationPrivilege.COMMUNITY_INVITE
      );

      // Not an existing user
      if (!canInviteToParent) {
        throw new RoleSetInvitationException(
          `New external user (${invitationData.email}) and the current user (${agentInfo.email}) does not have the privilege to invite to the parent community: ${roleSet.parentRoleSet.id}`,
          LogContext.COMMUNITY
        );
      } else {
        invitationData.communityInvitedToParent = true;
      }
    }

    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSet.id);

    let platformInvitation = await this.roleSetService.createPlatformInvitation(
      invitationData,
      agentInfo
    );

    platformInvitation =
      await this.platformInvitationService.save(platformInvitation);
    const authorizations =
      await this.platformInvitationAuthorizationService.applyAuthorizationPolicy(
        platformInvitation,
        roleSet.authorization
      );
    await this.authorizationPolicyService.save(authorizations);

    const notificationInput: NotificationInputPlatformInvitation = {
      triggeredBy: agentInfo.userID,
      community,
      invitedUser: invitationData.email,
      welcomeMessage: invitationData.welcomeMessage,
    };
    await this.notificationAdapter.platformInvitationCreated(notificationInput);
    return platformInvitation;
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IRoleSet, {
    description:
      'Join the specified Community as a member, without going through an approval process.',
  })
  @Profiling.api
  async joinRoleSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('joinCommunityData') joiningData: CommunityJoinInput
  ): Promise<IRoleSet> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      joiningData.roleSetID
    );
    const membershipStatus = await this.roleSetService.getMembershipStatus(
      agentInfo,
      roleSet
    );
    if (membershipStatus === CommunityMembershipStatus.INVITATION_PENDING) {
      throw new RoleSetMembershipException(
        `Unable to join Community (${roleSet.id}): invitation to join is pending.`,
        LogContext.COMMUNITY
      );
    }

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.COMMUNITY_JOIN,
      `join community: ${roleSet.id}`
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      CommunityRoleType.MEMBER,
      agentInfo.userID,
      agentInfo,
      true
    );

    return roleSet;
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
    return await this.roleSetLifecycleApplicationOptionsProvider.eventOnApplication(
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
    return await this.roleSetLifecycleInvitationOptionsProvider.eventOnInvitation(
      invitationEventData,
      agentInfo
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IRoleSet, {
    description: 'Update the Application Form used by this RoleSet.',
  })
  @Profiling.api
  async updateRoleSetApplicationForm(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('applicationFormData')
    applicationFormData: UpdateRoleSetApplicationFormInput
  ): Promise<IRoleSet> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      applicationFormData.roleSetID
    );

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.UPDATE,
      `update roleSet application form: ${roleSet.id}`
    );

    return await this.roleSetService.updateApplicationForm(
      roleSet,
      applicationFormData.formData
    );
  }
}
