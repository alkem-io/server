import {
  CreateApplicationInput,
  IApplication,
} from '@domain/community/application';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import {
  CommunityPolicyRoleLimitsException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { IUser } from '@domain/community/user/user.interface';
import { ICommunity } from '@domain/community/community';
import { ApplicationService } from '@domain/community/application/application.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { LogContext } from '@common/enums/logging.context';
import { OrganizationService } from '../organization/organization.service';
import { IOrganization } from '../organization/organization.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { CommunityRoleType } from '@common/enums/community.role';
import { CommunityContributorsUpdateType } from '@common/enums/community.contributors.update.type';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { InvitationService } from '../invitation/invitation.service';
import { IInvitation } from '../invitation/invitation.interface';
import { CreatePlatformInvitationOnCommunityInput } from './dto/community.role.dto.platform.invitation.community';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { CreateInvitationInput } from '../invitation/dto/invitation.dto.create';
import { CommunityMembershipException } from '@common/exceptions/community.membership.exception';
import { CommunityRoleEventsService } from './community.role.service.events';
import { IVirtualContributor } from '../virtual-contributor/virtual.contributor.interface';
import { VirtualContributorService } from '../virtual-contributor/virtual.contributor.service';
import { CommunityRoleImplicit } from '@common/enums/community.role.implicit';
import { AuthorizationCredential } from '@common/enums';
import { ContributorService } from '../contributor/contributor.service';
import { IContributor } from '../contributor/contributor.interface';
import { PlatformInvitationService } from '@platform/invitation/platform.invitation.service';
import { IPlatformInvitation } from '@platform/invitation';
import { CreatePlatformInvitationInput } from '@platform/invitation/dto/platform.invitation.dto.create';
import { AiServerAdapter } from '@services/adapters/ai-server-adapter/ai.server.adapter';
import { CommunityService } from '../community/community.service';
import { IRoleManager } from '@domain/access/role-manager';
import { RoleManagerService } from '@domain/access/role-manager/role.manager.service';
import { RoleService } from '@domain/access/role/role.service';

@Injectable()
export class CommunityRoleService {
  constructor(
    private agentService: AgentService,
    private userService: UserService,
    private contributorService: ContributorService,
    private organizationService: OrganizationService,
    private virtualContributorService: VirtualContributorService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private platformInvitationService: PlatformInvitationService,
    private communityResolverService: CommunityResolverService,
    private communityRoleEventsService: CommunityRoleEventsService,
    private communityService: CommunityService,
    private roleManagerService: RoleManagerService,
    private roleService: RoleService,
    private aiServerAdapter: AiServerAdapter, //TODO: remove this asap
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async removeAllCommunityRoles(roleManager: IRoleManager) {
    // Remove all issued role credentials for contributors
    for (const roleType of Object.values(CommunityRoleType)) {
      const users = await this.getUsersWithRole(roleManager, roleType);
      for (const user of users) {
        await this.removeUserFromRole(roleManager, roleType, user.id, false);
      }

      const organizations = await this.getOrganizationsWithRole(
        roleManager,
        roleType
      );
      for (const organization of organizations) {
        await this.removeOrganizationFromRole(
          roleManager,
          roleType,
          organization.id,
          false
        );
      }
    }
  }

  async getMembershipStatus(
    agentInfo: AgentInfo,
    community: ICommunity
  ): Promise<CommunityMembershipStatus> {
    if (!agentInfo.agentID) {
      return CommunityMembershipStatus.NOT_MEMBER;
    }
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);
    const isMember = await this.isMember(agent, community);
    if (isMember) return CommunityMembershipStatus.MEMBER;

    const openApplication = await this.findOpenApplication(
      agentInfo.userID,
      community.id
    );
    if (openApplication) return CommunityMembershipStatus.APPLICATION_PENDING;

    const openInvitation = await this.findOpenInvitation(
      agentInfo.userID,
      community.id
    );

    if (
      openInvitation &&
      (await this.invitationService.canInvitationBeAccepted(openInvitation.id))
    ) {
      return CommunityMembershipStatus.INVITATION_PENDING;
    }

    return CommunityMembershipStatus.NOT_MEMBER;
  }

  async getCommunityRoles(
    agentInfo: AgentInfo,
    community: ICommunity
  ): Promise<CommunityRoleType[]> {
    const result: CommunityRoleType[] = [];
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);
    const roles: CommunityRoleType[] = Object.values(
      CommunityRoleType
    ) as CommunityRoleType[];
    for (const role of roles) {
      const hasAgentRole = await this.isInRole(agent, community, role);
      if (hasAgentRole) {
        result.push(role);
      }
    }

    return result;
  }

  async getCommunityImplicitRoles(
    agentInfo: AgentInfo,
    community: ICommunity
  ): Promise<CommunityRoleImplicit[]> {
    const result: CommunityRoleImplicit[] = [];
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);

    const rolesImplicit: CommunityRoleImplicit[] = Object.values(
      CommunityRoleImplicit
    ) as CommunityRoleImplicit[];
    for (const role of rolesImplicit) {
      const hasAgentRole = await this.isInRoleImplicit(agent, community, role);
      if (hasAgentRole) {
        result.push(role);
      }
    }
    return result;
  }

  private async findOpenApplication(
    userID: string,
    roleManagerID: string
  ): Promise<IApplication | undefined> {
    const applications = await this.applicationService.findExistingApplications(
      userID,
      roleManagerID
    );
    for (const application of applications) {
      // skip any finalized applications; only want to return pending applications
      const isFinalized = await this.applicationService.isFinalizedApplication(
        application.id
      );
      if (isFinalized) continue;
      return application;
    }
    return undefined;
  }

  private async findOpenInvitation(
    contributorID: string,
    roleManagerID: string
  ): Promise<IInvitation | undefined> {
    const invitations = await this.invitationService.findExistingInvitations(
      contributorID,
      roleManagerID
    );
    for (const invitation of invitations) {
      // skip any finalized applications; only want to return pending applications
      const isFinalized = await this.invitationService.isFinalizedInvitation(
        invitation.id
      );
      if (isFinalized) continue;
      return invitation;
    }
    return undefined;
  }

  async getUsersWithRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    limit?: number
  ): Promise<IUser[]> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      roleManager,
      roleType
    );
    return await this.userService.usersWithCredentials(
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      },
      limit
    );
  }

  async getVirtualContributorsWithRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType
  ): Promise<IVirtualContributor[]> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      roleManager,
      roleType
    );
    return await this.virtualContributorService.virtualContributorsWithCredentials(
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
  }

  async getOrganizationsWithRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType
  ): Promise<IOrganization[]> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      roleManager,
      roleType
    );
    return await this.organizationService.organizationsWithCredentials({
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  async countContributorsPerRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    contributorType: CommunityContributorType
  ): Promise<number> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      roleManager,
      roleType
    );

    if (contributorType === CommunityContributorType.ORGANIZATION) {
      return await this.organizationService.countOrganizationsWithCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });
    }

    if (contributorType === CommunityContributorType.USER) {
      return await this.userService.countUsersWithCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });
    }

    return 0;
  }

  getCredentialDefinitionForRole(
    roleManager: IRoleManager,
    role: CommunityRoleType
  ): CredentialDefinition {
    const credential = this.roleManagerService.getCredentialForRole(
      roleManager,
      role
    );
    return credential;
  }

  async assignContributorToRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    contributorID: string,
    contributorType: CommunityContributorType,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IContributor> {
    switch (contributorType) {
      case CommunityContributorType.USER:
        return await this.assignUserToRole(
          roleManager,
          roleType,
          contributorID,
          agentInfo,
          triggerNewMemberEvents
        );
      case CommunityContributorType.ORGANIZATION:
        return await this.assignOrganizationToRole(
          roleManager,
          roleType,
          contributorID
        );
      case CommunityContributorType.VIRTUAL:
        return await this.assignVirtualToRole(
          roleManager,
          roleType,
          contributorID,
          agentInfo,
          triggerNewMemberEvents
        );
      default:
        throw new EntityNotInitializedException(
          `Invalid community contributor type: ${contributorType}`,
          LogContext.ROLES
        );
    }
  }

  async assignUserToRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    userID: string,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IUser> {
    const { user, agent } = await this.userService.getUserAndAgent(userID);
    const { isMember: hasMemberRoleInParent, parentCommunity } =
      await this.isMemberInParentCommunity(agent, roleManager.id);
    if (!hasMemberRoleInParent) {
      throw new ValidationException(
        `Unable to assign Agent (${agent.id}) to community (${roleManager.id}): agent is not a member of parent community ${parentCommunity?.id}`,
        LogContext.SPACES
      );
    }

    const userAlreadyHasRole = await this.isInRole(
      agent,
      roleManager,
      roleType
    );
    if (userAlreadyHasRole) {
      return user;
    }

    user.agent = await this.assignContributorAgentToRole(
      roleManager,
      roleType,
      agent,
      CommunityContributorType.USER
    );
    if (roleType === CommunityRoleType.ADMIN && parentCommunity) {
      // also assign as subspace admin in parent community if there is a parent community
      const credential = this.getCredentialForImplicitRole(
        parentCommunity,
        CommunityRoleImplicit.SUBSPACE_ADMIN
      );
      const alreadyHasSubspaceAdmin =
        await this.agentService.hasValidCredential(agent.id, credential);
      if (!alreadyHasSubspaceAdmin) {
        await this.assignContributorToImplicitRole(
          parentCommunity,
          agent,
          CommunityRoleImplicit.SUBSPACE_ADMIN
        );
      }
    }

    await this.contributorAddedToRole(
      user,
      roleManager,
      roleType,
      agentInfo,
      triggerNewMemberEvents
    );

    return user;
  }

  private async contributorAddedToRole(
    contributor: IContributor,
    roleManager: IRoleManager,
    role: CommunityRoleType,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ) {
    if (role === CommunityRoleType.MEMBER) {
      const community =
        await this.communityResolverService.getCommunityForRoleManager(
          roleManager.id
        );
      this.communityService.addMemberToCommunication(contributor, community);

      if (agentInfo) {
        await this.communityRoleEventsService.registerCommunityNewMemberActivity(
          community,
          contributor,
          agentInfo
        );

        if (triggerNewMemberEvents) {
          const levelZeroSpaceID =
            await this.communityService.getLevelZeroSpaceIdForCommunity(
              roleManager
            );
          const displayName =
            await this.communityService.getDisplayName(community);
          await this.communityRoleEventsService.processCommunityNewMemberEvents(
            community,
            levelZeroSpaceID,
            displayName,
            agentInfo,
            contributor
          );
        }
      }
    }
  }

  async assignVirtualToRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    virtualContributorID: string,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IVirtualContributor> {
    const { virtualContributor, agent } =
      await this.virtualContributorService.getVirtualContributorAndAgent(
        virtualContributorID
      );
    const { isMember: hasMemberRoleInParent, parentCommunity } =
      await this.isMemberInParentCommunity(agent, roleManager.id);
    if (!hasMemberRoleInParent) {
      if (!parentCommunity) {
        throw new ValidationException(
          `Unable to find parent community for community ${roleManager.id}`,
          LogContext.SPACES
        );
      }
      throw new ValidationException(
        `Unable to assign Agent (${agent.id}) to community (${roleManager.id}): agent is not a member of parent community ${parentCommunity.id}`,
        LogContext.SPACES
      );
    }

    const virtualAlreadyHasRole = await this.isInRole(
      agent,
      roleManager,
      roleType
    );
    if (virtualAlreadyHasRole) {
      return virtualContributor;
    }

    virtualContributor.agent = await this.assignContributorAgentToRole(
      roleManager,
      roleType,
      agent,
      CommunityContributorType.VIRTUAL
    );

    await this.contributorAddedToRole(
      virtualContributor,
      roleManager,
      roleType,
      agentInfo,
      triggerNewMemberEvents
    );
    // TO: THIS BREAKS THE DECOUPLING
    const space =
      await this.communityResolverService.getSpaceForRoleManagerOrFail(
        roleManager.id
      );
    this.aiServerAdapter.ensureContextIsLoaded(space.id);
    return virtualContributor;
  }

  private async isMemberInParentCommunity(
    agent: IAgent,
    communityID: string
  ): Promise<{ parentCommunity: ICommunity | undefined; isMember: boolean }> {
    const community = await this.communityService.getCommunityOrFail(
      communityID,
      {
        relations: { parentCommunity: true },
      }
    );

    // If the parent community is set, then check if the user is also a member there
    if (community.parentCommunity) {
      const isParentMember = await this.isMember(
        agent,
        community.parentCommunity
      );
      return {
        parentCommunity: community?.parentCommunity,
        isMember: isParentMember,
      };
    }
    return {
      parentCommunity: undefined,
      isMember: true,
    };
  }

  async assignOrganizationToRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    organizationID: string
  ): Promise<IOrganization> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(organizationID);

    organization.agent = await this.assignContributorAgentToRole(
      roleManager,
      roleType,
      agent,
      CommunityContributorType.ORGANIZATION
    );

    return organization;
  }

  async removeUserFromRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    userID: string,
    validatePolicyLimits = true
  ): Promise<IUser> {
    const { user, agent } = await this.userService.getUserAndAgent(userID);

    user.agent = await this.removeContributorFromRole(
      roleManager,
      roleType,
      agent,
      CommunityContributorType.USER,
      validatePolicyLimits
    );

    const parentRoleManager =
      await this.roleManagerService.getParentRoleManager(roleManager);
    if (roleType === CommunityRoleType.ADMIN && parentRoleManager) {
      // Check if an admin anywhere else in the community
      const peerRoleManagers =
        await this.roleManagerService.getPeerRoleManagers(
          parentRoleManager,
          roleManager
        );
      const hasAnotherAdminRole = peerRoleManagers.some(pc =>
        this.isInRole(agent, pc, CommunityRoleType.ADMIN)
      );

      if (!hasAnotherAdminRole) {
        await this.removeContributorToImplicitRole(
          parentRoleManager,
          agent,
          CommunityRoleImplicit.SUBSPACE_ADMIN
        );
      }
    }

    if (roleType === CommunityRoleType.MEMBER) {
      const community =
        await this.communityResolverService.getCommunityForRoleManager(
          roleManager.id
        );

      await this.communityService.removeMemberFromCommunication(
        community,
        user
      );
    }

    return user;
  }

  async removeOrganizationFromRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    organizationID: string,
    validatePolicyLimits = true
  ): Promise<IOrganization> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(organizationID);

    organization.agent = await this.removeContributorFromRole(
      roleManager,
      roleType,
      agent,
      CommunityContributorType.ORGANIZATION,
      validatePolicyLimits
    );

    return organization;
  }

  async removeVirtualFromRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    virtualContributorID: string,
    validatePolicyLimits = true
  ): Promise<IVirtualContributor> {
    const { virtualContributor, agent } =
      await this.virtualContributorService.getVirtualContributorAndAgent(
        virtualContributorID
      );

    virtualContributor.agent = await this.removeContributorFromRole(
      roleManager,
      roleType,
      agent,
      CommunityContributorType.VIRTUAL,
      validatePolicyLimits
    );

    return virtualContributor;
  }

  public async isCommunityAccountMatchingVcAccount(
    communityID: string,
    virtualContributorID: string
  ): Promise<boolean> {
    return await this.communityService.isCommunityAccountMatchingVcAccount(
      communityID,
      virtualContributorID
    );
  }

  private async validateUserCommunityPolicy(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    action: CommunityContributorsUpdateType
  ) {
    const userMembersCount = await this.countContributorsPerRole(
      roleManager,
      roleType,
      CommunityContributorType.USER
    );

    const roleDefinition = this.roleManagerService.getRoleDefinition(
      roleManager,
      roleType
    );

    const userPolicy = this.roleService.getUserPolicy(roleDefinition);

    if (action === CommunityContributorsUpdateType.ASSIGN) {
      if (userMembersCount === userPolicy.maximum) {
        throw new CommunityPolicyRoleLimitsException(
          `Max limit of users reached for role '${roleType}': ${userPolicy.maximum}, cannot assign new user.`,
          LogContext.COMMUNITY
        );
      }
    }

    if (action === CommunityContributorsUpdateType.REMOVE) {
      if (userMembersCount === userPolicy.minimum) {
        throw new CommunityPolicyRoleLimitsException(
          `Min limit of users reached for role '${roleType}': ${userPolicy.minimum}, cannot remove user.`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async validateOrganizationCommunityPolicy(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    action: CommunityContributorsUpdateType
  ) {
    const orgMemberCount = await this.countContributorsPerRole(
      roleManager,
      roleType,
      CommunityContributorType.ORGANIZATION
    );

    const roleDefinition = this.roleManagerService.getRoleDefinition(
      roleManager,
      roleType
    );

    const organizationPolicy =
      this.roleService.getOrganizationPolicy(roleDefinition);

    if (action === CommunityContributorsUpdateType.ASSIGN) {
      if (orgMemberCount === organizationPolicy.maximum) {
        throw new CommunityPolicyRoleLimitsException(
          `Max limit of organizations reached for role '${roleType}': ${organizationPolicy.maximum}, cannot assign new organization.`,
          LogContext.COMMUNITY
        );
      }
    }

    if (action === CommunityContributorsUpdateType.REMOVE) {
      if (orgMemberCount === organizationPolicy.minimum) {
        throw new CommunityPolicyRoleLimitsException(
          `Min limit of organizations reached for role '${roleType}': ${organizationPolicy.minimum}, cannot remove organization.`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async validateCommunityPolicyLimits(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    action: CommunityContributorsUpdateType,
    contributorType: CommunityContributorType
  ) {
    if (contributorType === CommunityContributorType.USER)
      await this.validateUserCommunityPolicy(roleManager, roleType, action);

    if (contributorType === CommunityContributorType.ORGANIZATION)
      await this.validateOrganizationCommunityPolicy(
        roleManager,
        roleType,
        action
      );
  }

  public async assignContributorAgentToRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    agent: IAgent,
    contributorType: CommunityContributorType
  ): Promise<IAgent> {
    await this.validateCommunityPolicyLimits(
      roleManager,
      roleType,
      CommunityContributorsUpdateType.ASSIGN,
      contributorType
    );

    const roleCredential = this.roleManagerService.getCredentialForRole(
      roleManager,
      roleType
    );

    return await this.agentService.grantCredential({
      agentID: agent.id,
      type: roleCredential.type,
      resourceID: roleCredential.resourceID,
    });
  }

  private async assignContributorToImplicitRole(
    roleManager: IRoleManager,
    agent: IAgent,
    role: CommunityRoleImplicit
  ): Promise<IAgent> {
    const credential = this.getCredentialForImplicitRole(roleManager, role);

    return await this.agentService.grantCredential({
      agentID: agent.id,
      type: credential.type,
      resourceID: credential.resourceID,
    });
  }

  private async removeContributorToImplicitRole(
    roleManager: IRoleManager,
    agent: IAgent,
    role: CommunityRoleImplicit
  ): Promise<IAgent> {
    const credential = this.getCredentialForImplicitRole(roleManager, role);

    return await this.agentService.revokeCredential({
      agentID: agent.id,
      type: credential.type,
      resourceID: credential.resourceID,
    });
  }

  private getCredentialForImplicitRole(
    roleManager: IRoleManager,
    role: CommunityRoleImplicit
  ): CredentialDefinition {
    // Use the admin credential to get the resourceID
    const adminCredential = this.getCredentialDefinitionForRole(
      roleManager,
      CommunityRoleType.ADMIN
    );
    const resourceID = adminCredential.resourceID;
    switch (role) {
      case CommunityRoleImplicit.SUBSPACE_ADMIN:
        return {
          type: AuthorizationCredential.SPACE_SUBSPACE_ADMIN,
          resourceID,
        };
      default: {
        throw new CommunityMembershipException(
          `Invalid implicit role: ${role}`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async removeContributorFromRole(
    roleManager: IRoleManager,
    roleType: CommunityRoleType,
    agent: IAgent,
    contributorType: CommunityContributorType,
    validatePolicyLimits: boolean
  ): Promise<IAgent> {
    if (validatePolicyLimits) {
      await this.validateCommunityPolicyLimits(
        roleManager,
        roleType,
        CommunityContributorsUpdateType.REMOVE,
        contributorType
      );
    }

    const roleCredential = this.roleManagerService.getCredentialForRole(
      roleManager,
      roleType
    );

    return await this.agentService.revokeCredential({
      agentID: agent.id,
      type: roleCredential.type,
      resourceID: roleCredential.resourceID,
    });
  }

  async isMember(agent: IAgent, roleManager: IRoleManager): Promise<boolean> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      roleManager,
      CommunityRoleType.MEMBER
    );

    const validCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
    return validCredential;
  }

  async isInRole(
    agent: IAgent,
    roleManager: IRoleManager,
    role: CommunityRoleType
  ): Promise<boolean> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      roleManager,
      role
    );

    const validCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
    return validCredential;
  }

  async isInRoleImplicit(
    agent: IAgent,
    roleManager: IRoleManager,
    role: CommunityRoleImplicit
  ): Promise<boolean> {
    const membershipCredential = this.getCredentialForImplicitRole(
      roleManager,
      role
    );

    const validCredential = await this.agentService.hasValidCredential(
      agent.id,
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
    return validCredential;
  }

  async createApplication(
    applicationData: CreateApplicationInput
  ): Promise<IApplication> {
    const { user, agent } = await this.userService.getUserAndAgent(
      applicationData.userID
    );
    const roleManager = await this.roleManagerService.getRoleManagerOrFail(
      applicationData.roleManagerID,
      {
        relations: {
          parentRoleManager: true,
        },
      }
    );

    await this.validateApplicationFromUser(user, agent, roleManager);

    const application =
      await this.applicationService.createApplication(applicationData);
    application.roleManager = roleManager;
    return await this.applicationService.save(application);
  }

  async createInvitationExistingContributor(
    invitationData: CreateInvitationInput
  ): Promise<IInvitation> {
    const { contributor: contributor, agent } =
      await this.contributorService.getContributorAndAgent(
        invitationData.invitedContributor
      );
    const roleManager = await this.roleManagerService.getRoleManagerOrFail(
      invitationData.roleManagerID
    );

    await this.validateInvitationToExistingContributor(
      contributor,
      agent,
      roleManager
    );

    const invitation = await this.invitationService.createInvitation(
      invitationData,
      contributor
    );
    invitation.roleManager = roleManager;

    return await this.invitationService.save(invitation);
  }

  async createPlatformInvitation(
    invitationData: CreatePlatformInvitationOnCommunityInput,
    agentInfo: AgentInfo
  ): Promise<IPlatformInvitation> {
    await this.validateInvitationToExternalUser(
      invitationData.email,
      invitationData.roleManagerID
    );
    const roleManager = await this.roleManagerService.getRoleManagerOrFail(
      invitationData.roleManagerID,
      {
        relations: {},
      }
    );

    const externalInvitationInput: CreatePlatformInvitationInput = {
      ...invitationData,
      createdBy: agentInfo.userID,
    };
    const externalInvitation =
      await this.platformInvitationService.createPlatformInvitation(
        externalInvitationInput
      );
    externalInvitation.roleManager = roleManager;
    return await this.platformInvitationService.save(externalInvitation);
  }

  private async validateApplicationFromUser(
    user: IUser,
    agent: IAgent,
    roleManager: IRoleManager
  ) {
    const openApplication = await this.findOpenApplication(
      user.id,
      roleManager.id
    );
    if (openApplication) {
      throw new CommunityMembershipException(
        `Application not possible: An open application (ID: ${openApplication.id}) already exists for contributor ${openApplication.user?.id} on Community: ${roleManager.id}.`,
        LogContext.COMMUNITY
      );
    }

    const openInvitation = await this.findOpenInvitation(
      user.id,
      roleManager.id
    );
    if (openInvitation) {
      throw new CommunityMembershipException(
        `Application not possible: An open invitation (ID: ${openInvitation.id}) already exists for contributor ${openInvitation.invitedContributor} (${openInvitation.contributorType}) on Community: ${roleManager.id}.`,
        LogContext.COMMUNITY
      );
    }

    // Check if the user is already a member; if so do not allow an application
    const isExistingMember = await this.isMember(agent, roleManager);
    if (isExistingMember)
      throw new CommunityMembershipException(
        `Application not possible: Contributor ${user.id} is already a member of the Community: ${roleManager.id}.`,
        LogContext.COMMUNITY
      );
  }

  private async validateInvitationToExistingContributor(
    contributor: IContributor,
    agent: IAgent,
    roleManager: IRoleManager
  ) {
    const openInvitation = await this.findOpenInvitation(
      contributor.id,
      roleManager.id
    );
    if (openInvitation) {
      throw new CommunityMembershipException(
        `Invitation not possible: An open invitation (ID: ${openInvitation.id}) already exists for contributor ${openInvitation.invitedContributor} (${openInvitation.contributorType}) on Community: ${roleManager.id}.`,
        LogContext.COMMUNITY
      );
    }

    const openApplication = await this.findOpenApplication(
      contributor.id,
      roleManager.id
    );
    if (openApplication) {
      throw new CommunityMembershipException(
        `Invitation not possible: An open application (ID: ${openApplication.id}) already exists for contributor ${openApplication.user?.id} on Community: ${roleManager.id}.`,
        LogContext.COMMUNITY
      );
    }

    // Check if the user is already a member; if so do not allow an application
    const isExistingMember = await this.isMember(agent, roleManager);
    if (isExistingMember)
      throw new CommunityMembershipException(
        `Invitation not possible: Contributor ${contributor.id} is already a member of the Community: ${roleManager.id}.`,
        LogContext.COMMUNITY
      );
  }

  private async validateInvitationToExternalUser(
    email: string,
    roleManagerID: string
  ) {
    // Check if a user with the provided email address already exists or not
    const isExistingUser = await this.userService.isRegisteredUser(email);
    if (isExistingUser) {
      throw new CommunityMembershipException(
        `User with the provided email address already exists: ${email}`,
        LogContext.COMMUNITY
      );
    }

    const platformInvitations =
      await this.platformInvitationService.findPlatformInvitationsForUser(
        email
      );
    for (const platformInvitation of platformInvitations) {
      if (
        platformInvitation.roleManager &&
        platformInvitation.roleManager.id === roleManagerID
      ) {
        throw new CommunityMembershipException(
          `An invitation with the provided email address (${email}) already exists for the specified community: ${roleManagerID}`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  async getApplications(roleManager: IRoleManager): Promise<IApplication[]> {
    const communityApplications =
      await this.roleManagerService.getRoleManagerOrFail(roleManager.id, {
        relations: { applications: true },
      });
    return communityApplications?.applications || [];
  }

  async getInvitations(roleManager: IRoleManager): Promise<IInvitation[]> {
    const roleManagerInvitations =
      await this.roleManagerService.getRoleManagerOrFail(roleManager.id, {
        relations: { invitations: true },
      });
    return roleManagerInvitations?.invitations || [];
  }

  async getPlatformInvitations(
    roleManager: IRoleManager
  ): Promise<IPlatformInvitation[]> {
    const communityInvs = await this.roleManagerService.getRoleManagerOrFail(
      roleManager.id,
      {
        relations: { platformInvitations: true },
      }
    );
    return communityInvs?.platformInvitations || [];
  }

  async getMembersCount(community: ICommunity): Promise<number> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      CommunityRoleType.MEMBER
    );

    const credentialMatches =
      await this.agentService.countAgentsWithMatchingCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });

    return credentialMatches;
  }
}
