import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { RoleName } from '@common/enums/role.name';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { RoleSetInvitationResultType } from '@common/enums/role.set.invitation.result.type';
import { RoleSetType } from '@common/enums/role.set.type';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { RoleSetInvitationException } from '@common/exceptions/role.set.invitation.exception';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { LicenseService } from '@domain/common/license/license.service';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { NotificationInputCommunityApplication } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.application';
import { NotificationInputCommunityInvitation } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.invitation';
import { NotificationInputPlatformInvitation } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.invitation.platform';
import { NotificationInputCommunityInvitationVirtualContributor } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.invitation.vc';
import { NotificationInputVirtualContributorSpaceCommunityInvitationDeclined } from '@services/adapters/notification-adapter/dto/space/notification.dto.input.space.community.invitation.vc.declined';
import { NotificationInputUserSpaceCommunityApplicationDeclined } from '@services/adapters/notification-adapter/dto/user/notification.dto.input.user.space.community.application.declined';
import { NotificationPlatformAdapter } from '@services/adapters/notification-adapter/notification.platform.adapter';
import { NotificationSpaceAdapter } from '@services/adapters/notification-adapter/notification.space.adapter';
import { NotificationUserAdapter } from '@services/adapters/notification-adapter/notification.user.adapter';
import { NotificationVirtualContributorAdapter } from '@services/adapters/notification-adapter/notification.virtual.contributor.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { compact } from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IApplication } from '../application/application.interface';
import { ApplicationService } from '../application/application.service';
import {
  ApplicationLifecycleEvent,
  ApplicationLifecycleState,
} from '../application/application.service.lifecycle';
import { ApplicationEventInput } from '../application/dto/application.dto.event';
import { CreateInvitationInput } from '../invitation/dto/invitation.dto.create';
import { InvitationEventInput } from '../invitation/dto/invitation.dto.event';
import { IInvitation } from '../invitation/invitation.interface';
import { InvitationService } from '../invitation/invitation.service';
import {
  InvitationLifecycleEvent,
  InvitationLifecycleState,
} from '../invitation/invitation.service.lifecycle';
import { ApplyForEntryRoleOnRoleSetInput } from './dto/role.set.dto.entry.role.apply';
import { InviteForEntryRoleOnRoleSetInput } from './dto/role.set.dto.entry.role.invite';
import { JoinAsEntryRoleOnRoleSetInput } from './dto/role.set.dto.entry.role.join';
import { UpdateApplicationFormOnRoleSetInput } from './dto/role.set.dto.update.application.form';
import { RoleSetInvitationResult } from './dto/role.set.invitation.result';
import { IRoleSet } from './role.set.interface';
import { RoleSetService } from './role.set.service';
import { RoleSetAuthorizationService } from './role.set.service.authorization';
import { RoleSetCacheService } from './role.set.service.cache';
import { RoleSetServiceLifecycleApplication } from './role.set.service.lifecycle.application';
import { RoleSetServiceLifecycleInvitation } from './role.set.service.lifecycle.invitation';

@InstrumentResolver()
@Resolver()
export class RoleSetResolverMutationsMembership {
  constructor(
    private authorizationService: AuthorizationService,
    private roleSetService: RoleSetService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private notificationUserAdapter: NotificationUserAdapter,
    private notificationAdapterSpace: NotificationSpaceAdapter,
    private notificationVirtualContributorAdapter: NotificationVirtualContributorAdapter,
    private notificationPlatformAdapter: NotificationPlatformAdapter,
    private userLookupService: UserLookupService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private accountLookupService: AccountLookupService,
    private communityResolverService: CommunityResolverService,
    private roleSetServiceLifecycleApplication: RoleSetServiceLifecycleApplication,
    private roleSetServiceLifecycleInvitation: RoleSetServiceLifecycleInvitation,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private contributorService: ContributorService,
    private platformInvitationService: PlatformInvitationService,
    private licenseService: LicenseService,
    private lifecycleService: LifecycleService,
    private roleSetCacheService: RoleSetCacheService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @Mutation(() => IRoleSet, {
    description:
      'Join the specified RoleSet using the entry Role, without going through an approval process.',
  })
  async joinRoleSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('joinData') joiningData: JoinAsEntryRoleOnRoleSetInput
  ): Promise<IRoleSet> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      joiningData.roleSetID
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    const membershipStatus =
      await this.roleSetService.getMembershipStatusByAgentInfo(
        agentInfo,
        roleSet
      );
    if (membershipStatus === CommunityMembershipStatus.INVITATION_PENDING) {
      throw new RoleSetMembershipException(
        `Unable to join RoleSet (${roleSet.id}): invitation to join is pending.`,
        LogContext.COMMUNITY
      );
    }

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_JOIN,
      `join community: ${roleSet.id}`
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      RoleName.MEMBER,
      agentInfo.userID,
      agentInfo,
      true
    );

    return roleSet;
  }

  @Mutation(() => IApplication, {
    description: 'Apply to join the specified RoleSet in the entry Role.',
  })
  async applyForEntryRoleOnRoleSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('applicationData') applicationData: ApplyForEntryRoleOnRoleSetInput
  ): Promise<IApplication> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      applicationData.roleSetID,
      {
        with: {
          parentRoleSet: true,
        },
      }
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_APPLY,
      `create application RoleSet: ${roleSet.id}`
    );

    if (roleSet.parentRoleSet) {
      const { agent } = await this.userLookupService.getUserAndAgent(
        agentInfo.userID
      );
      const userIsMemberInParent = await this.roleSetService.isInRole(
        agent,
        roleSet.parentRoleSet,
        RoleName.MEMBER
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

    await this.resetAuthorizationsOnRoleSetApplicationsInvitations(roleSet.id);

    // Send the notification
    const notificationInput: NotificationInputCommunityApplication = {
      triggeredBy: agentInfo.userID,
      community,
      application,
    };
    await this.notificationAdapterSpace.spaceCommunityApplicationCreated(
      notificationInput
    );

    return await this.applicationService.getApplicationOrFail(application.id);
  }

  @Mutation(() => [RoleSetInvitationResult], {
    description:
      'Invite new Contributors or users by email to join the specified RoleSet in the Entry Role.',
  })
  async inviteForEntryRoleOnRoleSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: InviteForEntryRoleOnRoleSetInput
  ): Promise<RoleSetInvitationResult[]> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      invitationData.roleSetID,
      {
        with: {
          parentRoleSet: {
            authorization: true,
            parentRoleSet: {
              authorization: true,
            },
          },
          license: {
            entitlements: true,
          },
        },
      }
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    if (
      invitationData.invitedContributorIDs.length === 0 &&
      invitationData.invitedUserEmails.length === 0
    ) {
      throw new RoleSetInvitationException(
        `No contributors were provided to invite: ${roleSet.id}`,
        LogContext.COMMUNITY
      );
    }

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE,
      `create invitation RoleSet: ${roleSet.id}`
    );

    const { authorizedToInviteToParentRoleSet } =
      this.getPrivilegesOnParentRoleSets(roleSet, agentInfo);

    const contributors: IContributor[] = [];
    for (const contributorID of invitationData.invitedContributorIDs) {
      const contributor =
        await this.contributorService.getContributorByUuidOrFail(
          contributorID,
          {
            with: {
              agent: true,
            },
          }
        );
      contributors.push(contributor);
    }

    // Check if any of the contributors are VCs and if so check if the entitlement is on
    if (roleSet.type === RoleSetType.SPACE) {
      for (const contributor of contributors) {
        if (contributor instanceof VirtualContributor) {
          this.licenseService.isEntitlementEnabledOrFail(
            roleSet.license,
            LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS
          );
        }
      }
    }

    // Loop through the emails provided to see if are existing users or not
    const newUserEmails: string[] = [];
    for (const email of invitationData.invitedUserEmails) {
      // If the user is already registered, then just create a normal invitation
      const existingUser = await this.userLookupService.getUserByEmail(email, {
        with: {
          agent: true,
        },
      });
      if (existingUser) {
        contributors.push(existingUser);
      } else {
        newUserEmails.push(email);
      }
    }

    const invitationResults = await this.inviteContributorsToEntryRole(
      roleSet,
      contributors,
      agentInfo,
      authorizedToInviteToParentRoleSet,
      invitationData.extraRoles,
      invitationData.welcomeMessage
    );

    const newUserInvitationResults =
      await this.inviteNewUsersByEmailToPlatformAndRoleSet(
        roleSet,
        newUserEmails,
        authorizedToInviteToParentRoleSet,
        invitationData.welcomeMessage,
        invitationData.extraRoles,
        agentInfo
      );
    invitationResults.push(...newUserInvitationResults);

    // Reset all authorizations on the invitations and applications because it's easier
    await this.resetAuthorizationsOnRoleSetApplicationsInvitations(roleSet.id);

    // Reload the invitations to get the latest authorizations
    const invitationsReloaded =
      await this.invitationService.getInvitationsOrFail(
        compact(invitationResults.map(result => result.invitation?.id))
      );

    for (const result of invitationResults) {
      if (result.invitation) {
        result.invitation = invitationsReloaded.find(
          invitationReloaded => invitationReloaded.id === result.invitation!.id
        );
      }
    }

    await this.sendNotificationEventsForInvitationsOnSpaceRoleSet(
      roleSet,
      agentInfo,
      invitationResults
    );

    return invitationResults;
  }

  private async inviteNewUsersByEmailToPlatformAndRoleSet(
    roleSet: IRoleSet,
    newUserEmails: string[],
    authorizedToInviteToParentRoleSet: boolean,
    welcomeMessage: string | undefined,
    extraRoles: RoleName[],
    agentInfo: AgentInfo
  ): Promise<RoleSetInvitationResult[]> {
    const invitationResults: RoleSetInvitationResult[] = [];
    // Rely on check already being made that there is no user with the emails
    for (const email of newUserEmails) {
      const existingPlatformInvitation =
        await this.platformInvitationService.getExistingPlatformInvitationForRoleSet(
          email,
          roleSet.id
        );
      if (existingPlatformInvitation) {
        const result: RoleSetInvitationResult = {
          type: RoleSetInvitationResultType.ALREADY_INVITED_TO_PLATFORM_AND_ROLE_SET,
          platformInvitation: existingPlatformInvitation,
        };
        invitationResults.push(result);
        continue;
      }

      // Not an existing user, and not an existing invitation so we need to create a new platform invitation
      // TODO: the logic for invitation to parent role set needs to be added here.
      let inviteToParentRoleSet = false;
      if (roleSet.parentRoleSet) {
        if (!authorizedToInviteToParentRoleSet) {
          const result: RoleSetInvitationResult = {
            type: RoleSetInvitationResultType.INVITATION_TO_PARENT_NOT_AUTHORIZED,
          };
          invitationResults.push(result);

          continue;
        }
        inviteToParentRoleSet = true;
      }

      const newPlatformInvitation =
        await this.roleSetService.createPlatformInvitation(
          roleSet,
          email,
          welcomeMessage || '',
          inviteToParentRoleSet,
          extraRoles,
          agentInfo
        );
      const result: RoleSetInvitationResult = {
        type: RoleSetInvitationResultType.INVITED_TO_PLATFORM_AND_ROLE_SET,
        platformInvitation: newPlatformInvitation,
      };
      invitationResults.push(result);
    }
    return invitationResults;
  }

  @Mutation(() => IApplication, {
    description: 'Trigger an event on the Application.',
  })
  async eventOnApplication(
    @Args('eventData')
    eventData: ApplicationEventInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IApplication> {
    let application = await this.applicationService.getApplicationOrFail(
      eventData.applicationID
    );

    // Assumption is that the user with the GRANT also has UPDATE
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      application.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on application: ${application.id}`
    );

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${eventData.eventName} triggered on application: ${application.id} using lifecycle ${application.lifecycle.id}`,
      LogContext.COMMUNITY
    );
    await this.lifecycleService.event({
      machine: this.roleSetServiceLifecycleApplication.getApplicationMachine(),
      eventName: eventData.eventName,
      lifecycle: application.lifecycle,
      agentInfo,
      authorization: application.authorization,
    });

    // Reload to trigger actions
    application = await this.applicationService.getApplicationOrFail(
      eventData.applicationID,
      {
        with: {
          roleSet: true,
          user: {
            agent: true,
          },
        },
      }
    );
    let applicationState = this.lifecycleService.getState(
      application.lifecycle,
      this.roleSetServiceLifecycleApplication.getApplicationMachine()
    );

    if (applicationState === ApplicationLifecycleState.APPROVING) {
      await this.roleSetService.approveApplication(
        eventData.applicationID,
        agentInfo
      );
      await this.lifecycleService.event({
        machine:
          this.roleSetServiceLifecycleApplication.getApplicationMachine(),
        lifecycle: application.lifecycle,
        eventName: ApplicationLifecycleEvent.APPROVED,
        agentInfo,
        authorization: application.authorization,
      });
    }

    if (!application.user || !application.user.agent || !application.roleSet) {
      this.logger.error(
        {
          message:
            'Unable to invalidate application cache because of missing relations',
          cause: 'Application user, user agent or role set is null',
          applicationID: application.id,
        },
        undefined,
        LogContext.COMMUNITY
      );
    } else {
      applicationState = this.lifecycleService.getState(
        application.lifecycle,
        this.roleSetServiceLifecycleApplication.getApplicationMachine()
      );

      // Send notification if application was declined/rejected
      if (applicationState === ApplicationLifecycleState.REJECTED) {
        const community =
          await this.communityResolverService.getCommunityForRoleSet(
            application.roleSet.id
          );
        const space =
          await this.communityResolverService.getSpaceForCommunityOrFail(
            community.id
          );

        const notificationInput: NotificationInputUserSpaceCommunityApplicationDeclined =
          {
            triggeredBy: agentInfo.userID,
            userID: application.user.id,
            spaceID: space.id,
          };

        await this.notificationUserAdapter.userSpaceCommunityApplicationDeclined(
          notificationInput,
          space
        );
      }

      const isMember = applicationState === ApplicationLifecycleState.APPROVED;
      await this.roleSetCacheService.deleteOpenApplicationFromCache(
        application.user.id,
        application.roleSet.id
      );
      await this.roleSetCacheService.deleteMembershipStatusCache(
        application.user.agent.id,
        application.roleSet.id
      );
      await this.roleSetCacheService.setAgentIsMemberCache(
        application.user.agent.id,
        application.roleSet.id,
        isMember
      );
    }

    return this.applicationService.getApplicationOrFail(
      eventData.applicationID
    );
  }

  @Mutation(() => IInvitation, {
    description: 'Trigger an event on the Invitation.',
  })
  async eventOnInvitation(
    @Args('eventData')
    eventData: InvitationEventInput,
    @CurrentUser() agentInfo: AgentInfo
  ): Promise<IInvitation> {
    let invitation = await this.invitationService.getInvitationOrFail(
      eventData.invitationID,
      {
        with: {
          roleSet: true,
        },
      }
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      invitation.authorization,
      AuthorizationPrivilege.UPDATE,
      `event on invitation: ${invitation.id}`
    );

    // Send the event, translated if needed
    this.logger.verbose?.(
      `Event ${eventData.eventName} triggered on invitation: ${invitation.id} using lifecycle ${invitation.lifecycle.id}`,
      LogContext.COMMUNITY
    );

    await this.lifecycleService.event({
      machine: this.roleSetServiceLifecycleInvitation.getInvitationMachine(),
      lifecycle: invitation.lifecycle,
      eventName: eventData.eventName,
      agentInfo,
      authorization: invitation.authorization,
    });

    // Reload to trigger actions
    invitation = await this.invitationService.getInvitationOrFail(
      eventData.invitationID,
      {
        with: {
          roleSet: true,
        },
      }
    );

    let invitationState = await this.invitationService.getLifecycleState(
      invitation.id
    );
    if (invitationState === InvitationLifecycleState.ACCEPTING) {
      await this.roleSetService.acceptInvitationToRoleSet(
        eventData.invitationID,
        agentInfo
      );
      await this.lifecycleService.event({
        machine: this.roleSetServiceLifecycleInvitation.getInvitationMachine(),
        lifecycle: invitation.lifecycle,
        eventName: InvitationLifecycleEvent.ACCEPTED,
        agentInfo,
        authorization: invitation.authorization,
      });
    }

    const invitedContributor = await this.contributorService.getContributor(
      invitation.invitedContributorID,
      { with: { agent: true } }
    );

    if (
      !invitedContributor ||
      !invitedContributor.agent ||
      !invitation.roleSet
    ) {
      this.logger.error(
        {
          message:
            'Unable to invalidate invitation cache because of missing relations',
          cause: 'Invited Contributor, Contributor Agent or role set is null',
          invitationID: invitation.id,
          invitedContributorID: invitation.invitedContributorID,
        },
        undefined,
        LogContext.COMMUNITY
      );
    } else {
      invitationState = this.lifecycleService.getState(
        invitation.lifecycle,
        this.roleSetServiceLifecycleInvitation.getInvitationMachine()
      );

      // Send notification if invitation was declined/rejected for Virtual Contributor
      if (invitationState === InvitationLifecycleState.REJECTED) {
        const isVirtualContributor =
          invitedContributor instanceof VirtualContributor;

        if (isVirtualContributor) {
          const community =
            await this.communityResolverService.getCommunityForRoleSet(
              invitation.roleSet.id
            );
          const space =
            await this.communityResolverService.getSpaceForCommunityOrFail(
              community.id
            );

          const notificationInput: NotificationInputVirtualContributorSpaceCommunityInvitationDeclined =
            {
              triggeredBy: agentInfo.userID, // Who declined the invitation
              invitationCreatedBy: invitation.createdBy, // Who sent the invitation (recipient)
              virtualContributorID: invitedContributor.id,
              spaceID: space.id,
            };

          await this.notificationAdapterSpace.spaceAdminVirtualContributorInvitationDeclined(
            notificationInput,
            space
          );
        }
      }

      const isMember = invitationState === InvitationLifecycleState.ACCEPTED;
      await this.roleSetCacheService.deleteOpenInvitationFromCache(
        invitedContributor.id,
        invitation.roleSet.id
      );
      await this.roleSetCacheService.deleteMembershipStatusCache(
        invitedContributor.agent.id,
        invitation.roleSet.id
      );
      await this.roleSetCacheService.setAgentIsMemberCache(
        invitedContributor.agent.id,
        invitation.roleSet.id,
        isMember
      );
    }

    return await this.invitationService.getInvitationOrFail(invitation.id);
  }

  @Mutation(() => IRoleSet, {
    description: 'Update the Application Form used by this RoleSet.',
  })
  async updateApplicationFormOnRoleSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('applicationFormData')
    applicationFormData: UpdateApplicationFormOnRoleSetInput
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

  private async inviteContributorsToEntryRole(
    roleSet: IRoleSet,
    contributors: IContributor[],
    agentInfo: AgentInfo,
    authorizedToInviteToParentRoleSet: boolean,
    extraRoles: RoleName[],
    welcomeMessage: string | undefined
  ): Promise<RoleSetInvitationResult[]> {
    const invitationResults: RoleSetInvitationResult[] = [];
    for (const contributor of contributors) {
      const contributorAgent = contributor.agent;
      if (!contributorAgent) {
        throw new EntityNotInitializedException(
          `Unable to load agent on contributor: ${contributor.id}`,
          LogContext.COMMUNITY
        );
      }
      let invitedToParent = false;
      // Logic is that the ability to invite to a subspace requires the ability to invite to the
      // parent community if the user is not a member there
      if (roleSet.parentRoleSet) {
        const isMember = await this.roleSetService.isMember(
          contributor.agent,
          roleSet.parentRoleSet
        );
        if (!isMember && !authorizedToInviteToParentRoleSet) {
          const result: RoleSetInvitationResult = {
            type: RoleSetInvitationResultType.INVITATION_TO_PARENT_NOT_AUTHORIZED,
          };
          invitationResults.push(result);
          continue;
        }
        invitedToParent = true;
      }

      const input: CreateInvitationInput = {
        roleSetID: roleSet.id,
        invitedContributorID: contributor.id,
        createdBy: agentInfo.userID,
        invitedToParent: invitedToParent,
        extraRoles: extraRoles,
        welcomeMessage,
      };

      const openInvitation = await this.roleSetService.findOpenInvitation(
        contributor.id,
        roleSet.id
      );
      if (openInvitation) {
        const result: RoleSetInvitationResult = {
          type: RoleSetInvitationResultType.ALREADY_INVITED_TO_ROLE_SET,
          invitation: openInvitation,
        };
        invitationResults.push(result);
        continue;
      }

      const invitation =
        await this.roleSetService.createInvitationExistingContributor(input);

      const invitationResult: RoleSetInvitationResult = {
        type: RoleSetInvitationResultType.INVITED_TO_ROLE_SET,
        invitation,
      };
      invitationResults.push(invitationResult);
    }
    return invitationResults;
  }

  private getPrivilegesOnParentRoleSets(
    roleSet: IRoleSet,
    agentInfo: AgentInfo
  ): {
    authorizedToInviteToParentRoleSet: boolean;
    authorizedToInviteToGrandParentRoleSet: boolean;
  } {
    let authorizedToInviteToParentRoleSet = false;
    let authorizedToInviteToGrandParentRoleSet = false;
    // Check if the the inviting user has permissions to invite to the parent if this is not the root
    if (roleSet.parentRoleSet) {
      const parentRoleSetAuthorization = roleSet.parentRoleSet.authorization;
      authorizedToInviteToParentRoleSet =
        this.authorizationService.isAccessGranted(
          agentInfo,
          parentRoleSetAuthorization,
          AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE
        );
      if (roleSet.parentRoleSet.parentRoleSet) {
        const grantParentRoleSetAuthorization =
          roleSet.parentRoleSet.parentRoleSet.authorization;
        authorizedToInviteToGrandParentRoleSet =
          this.authorizationService.isAccessGranted(
            agentInfo,
            grantParentRoleSetAuthorization,
            AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE
          );
      }
    }
    return {
      authorizedToInviteToParentRoleSet,
      authorizedToInviteToGrandParentRoleSet,
    };
  }

  private async sendNotificationEventsForInvitationsOnSpaceRoleSet(
    roleSet: IRoleSet,
    agentInfo: AgentInfo,
    invitationResults: RoleSetInvitationResult[]
  ) {
    // Only trigger the notifications for now on RoleSets for Spaces
    if (roleSet.type !== RoleSetType.SPACE) {
      return;
    }
    const community =
      await this.communityResolverService.getCommunityForRoleSet(roleSet.id);

    for (const invitationResult of invitationResults) {
      switch (invitationResult.type) {
        case RoleSetInvitationResultType.INVITED_TO_PLATFORM_AND_ROLE_SET: {
          const platformInvitation = invitationResult.platformInvitation;
          if (!platformInvitation) {
            throw new RelationshipNotFoundException(
              `Unable to load platform invitation for result: ${invitationResult.type}`,
              LogContext.ROLES
            );
          }
          const notificationInput: NotificationInputPlatformInvitation = {
            triggeredBy: agentInfo.userID,
            community,
            invitedUserEmail: platformInvitation.email,
            welcomeMessage: platformInvitation.welcomeMessage,
          };
          await this.notificationPlatformAdapter.platformInvitationCreated(
            notificationInput
          );
          break;
        }
        case RoleSetInvitationResultType.INVITED_TO_ROLE_SET: {
          const invitation = invitationResult.invitation;
          if (!invitation) {
            throw new RelationshipNotFoundException(
              `Unable to load invitation for result: ${invitationResult.type}`,
              LogContext.ROLES
            );
          }
          switch (invitation.contributorType) {
            case RoleSetContributorType.VIRTUAL: {
              const account =
                await this.virtualContributorLookupService.getAccountOrFail(
                  invitation.invitedContributorID
                );
              const accountProvider =
                await this.accountLookupService.getHostOrFail(account);

              const notificationInput: NotificationInputCommunityInvitationVirtualContributor =
                {
                  triggeredBy: agentInfo.userID,
                  community,
                  invitationID: invitation.id,
                  invitedContributorID: invitation.invitedContributorID,
                  accountHost: accountProvider,
                  welcomeMessage: invitation.welcomeMessage,
                };

              await this.notificationVirtualContributorAdapter.spaceCommunityInvitationVirtualContributorCreated(
                notificationInput
              );
              break;
            }
            case RoleSetContributorType.USER: {
              // Send the notification
              const notificationInput: NotificationInputCommunityInvitation = {
                triggeredBy: agentInfo.userID,
                community,
                invitationID: invitation.id,
                invitedContributorID: invitation.invitedContributorID,
                welcomeMessage: invitation.welcomeMessage,
              };

              await this.notificationUserAdapter.userSpaceCommunityInvitationCreated(
                notificationInput
              );
              break;
            }
            case RoleSetContributorType.ORGANIZATION: {
              // No notifications supported at the moment
              break;
            }
          }
          break;
        }
        case RoleSetInvitationResultType.ALREADY_INVITED_TO_PLATFORM_AND_ROLE_SET:
        case RoleSetInvitationResultType.ALREADY_INVITED_TO_ROLE_SET:
        case RoleSetInvitationResultType.INVITATION_TO_PARENT_NOT_AUTHORIZED: {
          // No notifications to be triggered
          break;
        }
      }
    }
  }

  private async resetAuthorizationsOnRoleSetApplicationsInvitations(
    roleSetID: string
  ) {
    // Logic is that the ability to invite to a subspace requires the ability to invite to the
    // parent community if the user is not a member there
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleSetID,

      {
        with: {
          invitations: true,
          platformInvitations: true,
          applications: true,
        },
      }
    );
    const authorizations =
      await this.roleSetAuthorizationService.applyAuthorizationPolicyOnInvitationsApplications(
        roleSet
      );
    await this.authorizationPolicyService.saveAll(authorizations);
  }

  private validateRoleSetTypeOrFail(
    roleSet: IRoleSet,
    allowedRoleSetTypes: RoleSetType[]
  ) {
    if (!allowedRoleSetTypes.includes(roleSet.type)) {
      throw new ValidationException(
        `Unable to carry out mutation on roleSet of type: ${roleSet.type}`,
        LogContext.PLATFORM
      );
    }
  }
}
