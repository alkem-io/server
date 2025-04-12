import { Inject, LoggerService } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RoleSetService } from './role.set.service';
import { CurrentUser } from '@src/common/decorators';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UpdateApplicationFormOnRoleSetInput } from './dto/role.set.dto.update.application.form';
import { IRoleSet } from './role.set.interface';
import { IInvitation } from '../invitation/invitation.interface';
import { InvitationEventInput } from '../invitation/dto/invitation.dto.event';
import { ApplicationEventInput } from '../application/dto/application.dto.event';
import { IApplication } from '../application/application.interface';
import { RoleName } from '@common/enums/role.name';
import { RoleSetMembershipException } from '@common/exceptions/role.set.membership.exception';
import { NotificationInputPlatformInvitation } from '@services/adapters/notification-adapter/dto/notification.dto.input.platform.invitation';
import { ApplicationService } from '../application/application.service';
import { InvitationService } from '../invitation/invitation.service';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { RoleSetServiceLifecycleApplication } from './role.set.service.lifecycle.application';
import { RoleSetServiceLifecycleInvitation } from './role.set.service.lifecycle.invitation';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { ApplyForEntryRoleOnRoleSetInput as ApplyForEntryRoleOnRoleSetInput } from './dto/role.set.dto.entry.role.apply';
import { NotificationInputCommunityApplication } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.application';
import { InviteForEntryRoleOnRoleSetInput } from './dto/role.set.dto.entry.role.invite';
import { RoleSetInvitationException } from '@common/exceptions/role.set.invitation.exception';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { CreateInvitationInput } from '../invitation/dto/invitation.dto.create';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { NotificationInputCommunityInvitationVirtualContributor } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.invitation.vc';
import { InviteUsersByEmailForRoleOnRoleSetInput } from './dto/role.set.dto.platform.invite.users.by.email';
import { NotificationInputCommunityInvitation } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.invitation';
import { RoleSetAuthorizationService } from './role.set.service.authorization';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { JoinAsEntryRoleOnRoleSetInput } from './dto/role.set.dto.entry.role.join';
import { LicenseService } from '@domain/common/license/license.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import {
  InvitationLifecycleEvent,
  InvitationLifecycleState,
} from '../invitation/invitation.service.lifecycle';
import {
  ApplicationLifecycleEvent,
  ApplicationLifecycleState,
} from '../application/application.service.lifecycle';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { VirtualContributorLookupService } from '@domain/community/virtual-contributor-lookup/virtual.contributor.lookup.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { UserLookupService } from '@domain/community/user-lookup/user.lookup.service';
import { RoleSetType } from '@common/enums/role.set.type';
import {
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { RoleSetCacheService } from './role.set.service.cache';
import { InstrumentResolver } from '@src/apm/decorators';
import { RoleSetInvitationResult } from './dto/role.set.invitation.result';
import { RoleSetInvitationResultType } from '@common/enums/role.set.invitation.result.type';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';

@InstrumentResolver()
@Resolver()
export class RoleSetResolverMutationsMembership {
  constructor(
    private authorizationService: AuthorizationService,
    private roleSetService: RoleSetService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private notificationAdapter: NotificationAdapter,
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
        relations: {
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
    };
    await this.notificationAdapter.applicationCreated(notificationInput);

    return await this.applicationService.getApplicationOrFail(application.id);
  }

  @Mutation(() => [IInvitation], {
    description:
      'Invite an existing Contributor to join the specified RoleSet in the Entry Role.',
  })
  async inviteContributorsEntryRoleOnRoleSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: InviteForEntryRoleOnRoleSetInput
  ): Promise<IInvitation[]> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      invitationData.roleSetID,
      {
        relations: {
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

    if (invitationData.invitedContributors.length === 0) {
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

    const invitationResults = await this.inviteContributorsToEntryRoleOnRoleSet(
      roleSet,
      contributors,
      agentInfo,
      authorizedToInviteToParentRoleSet,
      invitationData.extraRole,
      invitationData.welcomeMessage
    );

    await this.resetAuthorizationsOnRoleSetApplicationsInvitations(roleSet.id);

    await this.sendNotificationEventsForInvitationsOnSpaceRoleSet(
      roleSet,
      agentInfo,
      invitationResults
    );

    const invitations: IInvitation[] = [];
    for (const invitationResult of invitationResults) {
      if (invitationResult.invitation) {
        invitations.push(invitationResult.invitation);
      }
    }
    return invitations;
  }

  private async inviteContributorsToEntryRoleOnRoleSet(
    roleSet: IRoleSet,
    contributors: IContributor[],
    agentInfo: AgentInfo,
    authorizedToInviteToParentRoleSet: boolean,
    extraRole: RoleName | undefined,
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
          throw new RoleSetInvitationException(
            `Contributor is not a member of the parent community (${roleSet.parentRoleSet.id}) and the current user does not have the privilege to invite to the parent community`,
            LogContext.COMMUNITY
          );
        }
        invitedToParent = true;
      }

      const input: CreateInvitationInput = {
        roleSetID: roleSet.id,
        invitedContributorID: contributor.id,
        createdBy: agentInfo.userID,
        invitedToParent: invitedToParent,
        extraRole,
        welcomeMessage,
      };

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

  @Mutation(() => [RoleSetInvitationResult], {
    description:
      'Invite a set of Users by email to join the specified RoleSet as a member, including signing up for the platform if needed.',
  })
  async inviteUsersByEmailToRoleSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: InviteUsersByEmailForRoleOnRoleSetInput
  ): Promise<RoleSetInvitationResult[]> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      invitationData.roleSetID,
      {
        relations: {
          parentRoleSet: {
            authorization: true,
            parentRoleSet: {
              authorization: true,
            },
          },
        },
      }
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE,
      `create invitation external community: ${roleSet.id}`
    );

    const { authorizedToInviteToParentRoleSet } =
      this.getPrivilegesOnParentRoleSets(roleSet, agentInfo);

    // Process each user
    const invitationResults: RoleSetInvitationResult[] = [];
    for (const email of invitationData.emails) {
      // If the user is already registered, then just create a normal invitation
      const existingUser = await this.userLookupService.getUserByEmail(email, {
        relations: {
          agent: true,
        },
      });
      if (existingUser) {
        // Create a normal invitation
        const existingUserInvitationResults =
          await this.inviteContributorsToEntryRoleOnRoleSet(
            roleSet,
            [existingUser],
            agentInfo,
            authorizedToInviteToParentRoleSet,
            invitationData.roleSetExtraRole,
            invitationData.welcomeMessage
          );
        invitationResults.push(...existingUserInvitationResults);
        continue;
      }

      // Is the user already invited?
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
      const inviteToParentRoleSet = authorizedToInviteToParentRoleSet;
      const newPlatformInvitation =
        await this.roleSetService.createPlatformInvitation(
          roleSet,
          email,
          invitationData.welcomeMessage || '',
          inviteToParentRoleSet,
          invitationData.roleSetExtraRole,
          agentInfo
        );
      const result: RoleSetInvitationResult = {
        type: RoleSetInvitationResultType.INVITED_TO_PLATFORM_AND_ROLE_SET,
        platformInvitation: newPlatformInvitation,
      };
      invitationResults.push(result);
      continue;
    }

    await this.resetAuthorizationsOnRoleSetApplicationsInvitations(roleSet.id);

    if (roleSet.type === RoleSetType.SPACE) {
      await this.sendNotificationEventsForInvitationsOnSpaceRoleSet(
        roleSet,
        agentInfo,
        invitationResults
      );
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
        relations: {
          roleSet: true,
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

    if (agentInfo.userID && application.roleSet) {
      applicationState = this.lifecycleService.getState(
        application.lifecycle,
        this.roleSetServiceLifecycleApplication.getApplicationMachine()
      );
      const isMember = applicationState === ApplicationLifecycleState.APPROVED;
      if (agentInfo.userID && application.roleSet) {
        await this.roleSetCacheService.deleteOpenApplicationFromCache(
          agentInfo.userID,
          application.roleSet?.id
        );
        await this.roleSetCacheService.setAgentIsMemberCache(
          agentInfo.agentID,
          application.roleSet?.id,
          isMember
        );
      }
    }

    return await this.applicationService.getApplicationOrFail(
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
        relations: {
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
        relations: {
          roleSet: true,
        },
      }
    );
    let invitationState = await this.invitationService.getLifecycleState(
      invitation.id
    );
    if (invitationState === InvitationLifecycleState.ACCEPTING) {
      if (invitation.roleSet && agentInfo.userID) {
        await this.roleSetCacheService.deleteOpenInvitationFromCache(
          agentInfo.userID,
          invitation.roleSet.id
        );
      }
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

    if (agentInfo.userID && invitation.roleSet) {
      invitationState = this.lifecycleService.getState(
        invitation.lifecycle,
        this.roleSetServiceLifecycleApplication.getApplicationMachine()
      );
      const isMember = invitationState === ApplicationLifecycleState.APPROVED;
      if (agentInfo.userID && invitation.roleSet) {
        await this.roleSetCacheService.deleteOpenInvitationFromCache(
          agentInfo.userID,
          invitation.roleSet.id
        );
        await this.roleSetCacheService.setAgentIsMemberCache(
          agentInfo.agentID,
          invitation.roleSet.id,
          isMember
        );
      }
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
            invitedUser: platformInvitation.email,
            welcomeMessage: platformInvitation.welcomeMessage,
          };
          await this.notificationAdapter.platformInvitationCreated(
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
                  invitedContributorID: invitation.invitedContributorID,
                  accountHost: accountProvider,
                  welcomeMessage: invitation.welcomeMessage,
                };

              await this.notificationAdapter.invitationVirtualContributorCreated(
                notificationInput
              );
            }
            case RoleSetContributorType.USER: {
              // Send the notification
              const notificationInput: NotificationInputCommunityInvitation = {
                triggeredBy: agentInfo.userID,
                community,
                invitedContributorID: invitation.invitedContributorID,
                welcomeMessage: invitation.welcomeMessage,
              };

              await this.notificationAdapter.invitationCreated(
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
          // Nothing to do?
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
        relations: {
          invitations: true,
          platformInvitations: true,
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
