import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { RoleSetService } from './role.set.service';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
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
import { ApplicationAuthorizationService } from '../application/application.service.authorization';
import { InvitationService } from '../invitation/invitation.service';
import { InvitationAuthorizationService } from '../invitation/invitation.service.authorization';
import { ContributorService } from '@domain/community/contributor/contributor.service';
import { PlatformInvitationAuthorizationService } from '@domain/access/invitation.platform/platform.invitation.service.authorization';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { NotificationAdapter } from '@services/adapters/notification-adapter/notification.adapter';
import { UserAuthorizationService } from '@domain/community/user/user.service.authorization';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { RoleSetServiceLifecycleApplication } from './role.set.service.lifecycle.application';
import { RoleSetServiceLifecycleInvitation } from './role.set.service.lifecycle.invitation';
import { PlatformInvitationService } from '@domain/access/invitation.platform/platform.invitation.service';
import { AssignRoleOnRoleSetToUserInput } from './dto/role.set.dto.role.assign.user';
import { IUser } from '@domain/community/user/user.interface';
import { IOrganization } from '@domain/community/organization/organization.interface';
import { AssignRoleOnRoleSetToOrganizationInput } from './dto/role.set.dto.role.assign.organization';
import { IVirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.interface';
import { AssignRoleOnRoleSetToVirtualContributorInput } from './dto/role.set.dto.role.assign.virtual';
import { RemoveRoleOnRoleSetFromUserInput } from './dto/role.set.dto.role.remove.user';
import { RemoveRoleOnRoleSetFromOrganizationInput } from './dto/role.set.dto.role.remove.organization';
import { RemoveRoleOnRoleSetFromVirtualContributorInput } from './dto/role.set.dto.role.remove.virtual';
import { ApplyForEntryRoleOnRoleSetInput as ApplyForEntryRoleOnRoleSetInput } from './dto/role.set.dto.entry.role.apply';
import { NotificationInputCommunityApplication } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.application';
import { InviteForEntryRoleOnRoleSetInput } from './dto/role.set.dto.entry.role.invite';
import { RoleSetInvitationException } from '@common/exceptions/role.set.invitation.exception';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { CreateInvitationInput } from '../invitation/dto/invitation.dto.create';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { NotificationInputCommunityInvitationVirtualContributor } from '@services/adapters/notification-adapter/dto/notification.dto.input.community.invitation.vc';
import { IPlatformInvitation } from '@domain/access/invitation.platform/platform.invitation.interface';
import { InviteNewContributorForRoleOnRoleSetInput } from './dto/role.set.dto.platform.invitation.community';
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
import { ValidationException } from '@common/exceptions';
import { RoleSetCacheService } from './role.set.service.cache';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class RoleSetResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private roleSetService: RoleSetService,
    private roleSetAuthorizationService: RoleSetAuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private notificationAdapter: NotificationAdapter,
    private userLookupService: UserLookupService,
    private userAuthorizationService: UserAuthorizationService,
    private virtualContributorLookupService: VirtualContributorLookupService,
    private accountLookupService: AccountLookupService,
    private communityResolverService: CommunityResolverService,
    private roleSetServiceLifecycleApplication: RoleSetServiceLifecycleApplication,
    private roleSetServiceLifecycleInvitation: RoleSetServiceLifecycleInvitation,
    private applicationService: ApplicationService,
    private applicationAuthorizationService: ApplicationAuthorizationService,
    private invitationService: InvitationService,
    private invitationAuthorizationService: InvitationAuthorizationService,
    private contributorService: ContributorService,
    private platformInvitationAuthorizationService: PlatformInvitationAuthorizationService,
    private platformInvitationService: PlatformInvitationService,
    private licenseService: LicenseService,
    private lifecycleService: LifecycleService,
    private roleSetCacheService: RoleSetCacheService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Assigns a User to a role in the specified Community.',
  })
  async assignRoleToUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: AssignRoleOnRoleSetToUserInput
  ): Promise<IUser> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );

    this.validateRoleSetTypeOrFail(roleSet, [
      RoleSetType.SPACE,
      RoleSetType.ORGANIZATION,
    ]);

    let privilegeRequired = AuthorizationPrivilege.GRANT_GLOBAL_ADMINS;
    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        privilegeRequired = AuthorizationPrivilege.GRANT;
        if (roleData.role === RoleName.MEMBER) {
          privilegeRequired = AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN;
        }
        break;
      }
      case RoleSetType.ORGANIZATION: {
        privilegeRequired = AuthorizationPrivilege.GRANT;
        break;
      }
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      privilegeRequired,
      `assign role to User: ${roleSet.id} on roleSet of type: ${roleSet.type}`
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      roleData.role,
      roleData.contributorID,
      agentInfo,
      true
    );

    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        // reset the user authorization policy so that their profile is visible to other community members
        const user = await this.userLookupService.getUserOrFail(
          roleData.contributorID
        );
        const authorizations =
          await this.userAuthorizationService.applyAuthorizationPolicy(user.id);
        await this.authorizationPolicyService.saveAll(authorizations);
        break;
      }
      case RoleSetType.ORGANIZATION: {
        break;
      }
    }

    return await this.userLookupService.getUserOrFail(roleData.contributorID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description: 'Assigns an Organization a Role in the specified Community.',
  })
  async assignRoleToOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData')
    roleData: AssignRoleOnRoleSetToOrganizationInput
  ): Promise<IOrganization> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.GRANT,
      `assign organization RoleSet role: ${roleSet.id}`
    );
    return await this.roleSetService.assignOrganizationToRole(
      roleSet,
      roleData.role,
      roleData.contributorID
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description:
      'Assigns a Virtual Contributor to a role in the specified Community.',
  })
  async assignRoleToVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: AssignRoleOnRoleSetToVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID,
      {
        relations: {
          license: {
            entitlements: true,
          },
        },
      }
    );

    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    // Note re COMMUNITY_ASSIGN_VC_FROM_ACCOUNT
    // The ability to assign the VC is a function of the space and the VC, not of the user
    // So it is a privilege to be able to assign from the same account,
    // but this is separate from the business logic check that the space and the
    // account are in the same account.
    let requiredPrivilege = AuthorizationPrivilege.GRANT;
    if (roleData.role === RoleName.MEMBER) {
      const sameAccount =
        await this.roleSetService.isRoleSetAccountMatchingVcAccount(
          roleSet,
          roleData.contributorID
        );
      if (sameAccount) {
        requiredPrivilege =
          AuthorizationPrivilege.COMMUNITY_ASSIGN_VC_FROM_ACCOUNT;
      } else {
        requiredPrivilege = AuthorizationPrivilege.ROLESET_ENTRY_ROLE_ASSIGN;
      }
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      requiredPrivilege,
      `assign virtual community role: ${roleSet.id}`
    );

    // Also require SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS entitlement for the RoleSet
    if (roleSet.type === RoleSetType.SPACE) {
      this.licenseService.isEntitlementEnabledOrFail(
        roleSet.license,
        LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS
      );
    }

    await this.roleSetService.assignVirtualToRole(
      roleSet,
      roleData.role,
      roleData.contributorID,
      agentInfo,
      true
    );

    return await this.virtualContributorLookupService.getVirtualContributorOrFail(
      roleData.contributorID
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IUser, {
    description: 'Removes a User from a Role in the specified Community.',
  })
  async removeRoleFromUser(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: RemoveRoleOnRoleSetFromUserInput
  ): Promise<IUser> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );
    this.validateRoleSetTypeOrFail(roleSet, [
      RoleSetType.SPACE,
      RoleSetType.ORGANIZATION,
    ]);

    let privilegeRequired = AuthorizationPrivilege.GRANT;
    let extendedAuthorization = roleSet.authorization;
    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        privilegeRequired = AuthorizationPrivilege.GRANT;
        if (roleData.role === RoleName.MEMBER) {
          // Extend the authorization policy with a credential rule to assign the GRANT privilege
          // to the user specified in the incoming mutation. Then if it is the same user as is logged
          // in then the user will have the GRANT privilege + so can carry out the mutation
          extendedAuthorization =
            this.roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
              roleSet,
              roleData.contributorID
            );
        }
        break;
      }
      case RoleSetType.ORGANIZATION: {
        privilegeRequired = AuthorizationPrivilege.GRANT;
        if (roleData.role === RoleName.ASSOCIATE) {
          // Extend the authorization policy with a credential rule to assign the GRANT privilege
          // to the user specified in the incoming mutation. Then if it is the same user as is logged
          // in then the user will have the GRANT privilege + so can carry out the mutation
          extendedAuthorization =
            this.roleSetAuthorizationService.extendAuthorizationPolicyForSelfRemoval(
              roleSet,
              roleData.contributorID
            );
        }
        break;
      }
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      extendedAuthorization,
      privilegeRequired,
      `remove role from User: ${roleSet.id} on roleSet of type ${roleSet.type}`
    );

    await this.roleSetService.removeUserFromRole(
      roleSet,
      roleData.role,
      roleData.contributorID,
      true
    );

    switch (roleSet.type) {
      case RoleSetType.SPACE: {
        // reset the user authorization policy so that their profile is not visible
        // to other community members
        const user = await this.userLookupService.getUserOrFail(
          roleData.contributorID
        );
        const authorizations =
          await this.userAuthorizationService.applyAuthorizationPolicy(user.id);
        await this.authorizationPolicyService.saveAll(authorizations);
        break;
      }
      case RoleSetType.ORGANIZATION: {
        break;
      }
    }

    return await this.userLookupService.getUserOrFail(roleData.contributorID);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IOrganization, {
    description:
      'Removes an Organization from a Role in the specified Community.',
  })
  async removeRoleFromOrganization(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: RemoveRoleOnRoleSetFromOrganizationInput
  ): Promise<IOrganization> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.GRANT,
      `remove community role organization: ${roleSet.id}`
    );

    return await this.roleSetService.removeOrganizationFromRole(
      roleSet,
      roleData.role,
      roleData.contributorID
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Removes a Virtual from a Role in the specified Community.',
  })
  async removeRoleFromVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('roleData') roleData: RemoveRoleOnRoleSetFromVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const roleSet = await this.roleSetService.getRoleSetOrFail(
      roleData.roleSetID
    );
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    // Extend the authorization policy with a credential rule to assign the GRANT privilege
    // to the user with rights around the incoming virtual being removed.
    //. Then if it is the user that is logged in then the user will have the GRANT privilege + so can carry out the mutation
    const extendedAuthorization =
      await this.roleSetAuthorizationService.extendAuthorizationPolicyForVirtualContributorRemoval(
        roleSet,
        roleData.contributorID
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
      roleData.contributorID
    );

    return await this.virtualContributorLookupService.getVirtualContributorOrFail(
      roleData.contributorID
    );
  }

  @UseGuards(GraphqlGuard)
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

  @UseGuards(GraphqlGuard)
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

    application.authorization =
      await this.applicationAuthorizationService.applyAuthorizationPolicy(
        application,
        roleSet.authorization
      );
    await this.authorizationPolicyService.save(application.authorization);

    // Send the notification
    const notificationInput: NotificationInputCommunityApplication = {
      triggeredBy: agentInfo.userID,
      community,
    };
    await this.notificationAdapter.applicationCreated(notificationInput);

    return await this.applicationService.getApplicationOrFail(application.id);
  }

  @UseGuards(GraphqlGuard)
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

    // Logic is that the ability to invite to a subspace requires the ability to invite to the
    // parent community if the user is not a member there
    if (roleSet.parentRoleSet) {
      const parentRoleSetAuthorization = roleSet.parentRoleSet.authorization;
      const canInviteToParent = this.authorizationService.isAccessGranted(
        agentInfo,
        parentRoleSetAuthorization,
        AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE
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
          invitationData.extraRole,
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
    extraRole?: RoleName,
    welcomeMessage?: string
  ): Promise<IInvitation> {
    const input: CreateInvitationInput = {
      roleSetID: roleSet.id,
      invitedContributorID: invitedContributor.id,
      createdBy: agentInfo.userID,
      invitedToParent,
      extraRole,
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
      const account =
        await this.virtualContributorLookupService.getAccountOrFail(
          invitedContributor.id
        );
      const accountProvider =
        await this.accountLookupService.getHostOrFail(account);

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

    return await this.invitationService.getInvitationOrFail(invitation.id);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPlatformInvitation, {
    description:
      'Invite a User to join the platform and the specified RoleSet as a member.',
  })
  async inviteUserToPlatformAndRoleSet(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('invitationData')
    invitationData: InviteNewContributorForRoleOnRoleSetInput
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
    this.validateRoleSetTypeOrFail(roleSet, [RoleSetType.SPACE]);

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      roleSet.authorization,
      AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE,
      `create invitation external community: ${roleSet.id}`
    );

    const existingUser = await this.userLookupService.isRegisteredUser(
      invitationData.email
    );

    if (existingUser) {
      throw new RoleSetInvitationException(
        `User already has a profile (${invitationData.email})`,
        LogContext.COMMUNITY
      );
    }

    // Logic is that the ability to invite to a subspace requires the ability to invite to the
    // parent community if the user is not a member there
    if (roleSet.parentRoleSet) {
      const parentRoleSetAuthorization = roleSet.parentRoleSet.authorization;
      const canInviteToParent = this.authorizationService.isAccessGranted(
        agentInfo,
        parentRoleSetAuthorization,
        AuthorizationPrivilege.ROLESET_ENTRY_ROLE_INVITE
      );

      // Not an existing user
      if (!canInviteToParent) {
        throw new RoleSetInvitationException(
          `New external user (${invitationData.email}) and the current user (${agentInfo.email}) does not have the privilege to invite to the parent community: ${roleSet.parentRoleSet.id}`,
          LogContext.COMMUNITY
        );
      } else {
        invitationData.roleSetInvitedToParent = true;
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

  @UseGuards(GraphqlGuard)
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

  @UseGuards(GraphqlGuard)
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
