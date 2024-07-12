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
import { IUser } from '@domain/community/user';
import { ICommunity } from '@domain/community/community';
import { ApplicationService } from '@domain/community/application/application.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { LogContext } from '@common/enums/logging.context';
import { OrganizationService } from '../organization/organization.service';
import { IOrganization } from '../organization/organization.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { CommunityRole } from '@common/enums/community.role';
import { CommunityContributorsUpdateType } from '@common/enums/community.contributors.update.type';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { ICommunityRolePolicy } from '../community-policy/community.policy.role.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { InvitationService } from '../invitation/invitation.service';
import { IInvitation } from '../invitation/invitation.interface';
import { CreatePlatformInvitationOnCommunityInput } from './dto/community.role.dto.platform.invitation.community';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { CreateInvitationInput } from '../invitation/dto/invitation.dto.create';
import { CommunityMembershipException } from '@common/exceptions/community.membership.exception';
import { CommunityRoleEventsService } from './community.role.service.events';
import { IVirtualContributor } from '../virtual-contributor';
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
    private aiServerAdapter: AiServerAdapter, //TODO: remove this asap
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async removeAllCommunityRoles(community: ICommunity) {
    // Remove all issued role credentials for contributors
    for (const role of Object.values(CommunityRole)) {
      const users = await this.getUsersWithRole(community, role);
      for (const user of users) {
        await this.removeUserFromRole(community, user.id, role, false);
      }

      const organizations = await this.getOrganizationsWithRole(
        community,
        role
      );
      for (const organization of organizations) {
        await this.removeOrganizationFromRole(
          community,
          organization.id,
          role,
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
  ): Promise<CommunityRole[]> {
    const result: CommunityRole[] = [];
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);
    const roles: CommunityRole[] = Object.values(
      CommunityRole
    ) as CommunityRole[];
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
    communityID: string
  ): Promise<IApplication | undefined> {
    const applications = await this.applicationService.findExistingApplications(
      userID,
      communityID
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
    communityID: string
  ): Promise<IInvitation | undefined> {
    const invitations = await this.invitationService.findExistingInvitations(
      contributorID,
      communityID
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
    community: ICommunity,
    role: CommunityRole,
    limit?: number
  ): Promise<IUser[]> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      role
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
    community: ICommunity,
    role: CommunityRole
  ): Promise<IVirtualContributor[]> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      role
    );
    return await this.virtualContributorService.virtualContributorsWithCredentials(
      {
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      }
    );
  }

  async getOrganizationsWithRole(
    community: ICommunity,
    role: CommunityRole
  ): Promise<IOrganization[]> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      role
    );
    return await this.organizationService.organizationsWithCredentials({
      type: membershipCredential.type,
      resourceID: membershipCredential.resourceID,
    });
  }

  async countContributorsPerRole(
    community: ICommunity,
    role: CommunityRole,
    contributorType: CommunityContributorType
  ): Promise<number> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      role
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
    community: ICommunity,
    role: CommunityRole
  ): CredentialDefinition {
    const policyRole = this.communityService.getCommunityPolicyForRole(
      community,
      role
    );
    return policyRole.credential;
  }

  async assignContributorToRole(
    community: ICommunity,
    contributorID: string,
    role: CommunityRole,
    contributorType: CommunityContributorType,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IContributor> {
    switch (contributorType) {
      case CommunityContributorType.USER:
        return await this.assignUserToRole(
          community,
          contributorID,
          role,
          agentInfo,
          triggerNewMemberEvents
        );
      case CommunityContributorType.ORGANIZATION:
        return await this.assignOrganizationToRole(
          community,
          contributorID,
          role
        );
      case CommunityContributorType.VIRTUAL:
        return await this.assignVirtualToRole(
          community,
          contributorID,
          role,
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
    community: ICommunity,
    userID: string,
    role: CommunityRole,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IUser> {
    const { user, agent } = await this.userService.getUserAndAgent(userID);
    const { isMember: hasMemberRoleInParent, parentCommunity } =
      await this.isMemberInParentCommunity(agent, community.id);
    if (!hasMemberRoleInParent) {
      throw new ValidationException(
        `Unable to assign Agent (${agent.id}) to community (${community.id}): agent is not a member of parent community ${parentCommunity?.id}`,
        LogContext.SPACES
      );
    }

    const userAlreadyHasRole = await this.isInRole(agent, community, role);
    if (userAlreadyHasRole) {
      return user;
    }

    user.agent = await this.assignContributorAgentToRole(
      community,
      agent,
      role,
      CommunityContributorType.USER
    );
    if (role === CommunityRole.ADMIN && parentCommunity) {
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
      community,
      role,
      agentInfo,
      triggerNewMemberEvents
    );

    return user;
  }

  private async contributorAddedToRole(
    contributor: IContributor,
    community: ICommunity,
    role: CommunityRole,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ) {
    if (role === CommunityRole.MEMBER) {
      this.communityService.addMemberToCommunication(contributor, community);

      if (agentInfo) {
        await this.communityRoleEventsService.registerCommunityNewMemberActivity(
          community,
          contributor,
          agentInfo
        );

        if (triggerNewMemberEvents) {
          const rootSpaceID = await this.communityService.getRootSpaceID(
            community
          );
          const displayName = await this.communityService.getDisplayName(
            community
          );
          await this.communityRoleEventsService.processCommunityNewMemberEvents(
            community,
            rootSpaceID,
            displayName,
            agentInfo,
            contributor
          );
        }
      }
    }
  }

  async assignVirtualToRole(
    community: ICommunity,
    virtualContributorID: string,
    role: CommunityRole,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IVirtualContributor> {
    const { virtualContributor, agent } =
      await this.virtualContributorService.getVirtualContributorAndAgent(
        virtualContributorID
      );
    const { isMember: hasMemberRoleInParent, parentCommunity } =
      await this.isMemberInParentCommunity(agent, community.id);
    if (!hasMemberRoleInParent) {
      if (!parentCommunity) {
        throw new ValidationException(
          `Unable to find parent community for community ${community.id}`,
          LogContext.SPACES
        );
      }
      throw new ValidationException(
        `Unable to assign Agent (${agent.id}) to community (${community.id}): agent is not a member of parent community ${parentCommunity.id}`,
        LogContext.SPACES
      );
    }

    const virtualAlreadyHasRole = await this.isInRole(agent, community, role);
    if (virtualAlreadyHasRole) {
      return virtualContributor;
    }

    virtualContributor.agent = await this.assignContributorAgentToRole(
      community,
      agent,
      role,
      CommunityContributorType.VIRTUAL
    );

    await this.contributorAddedToRole(
      virtualContributor,
      community,
      role,
      agentInfo,
      triggerNewMemberEvents
    );
    // TO: THIS BREAKS THE DECOUPLING
    const space =
      await this.communityResolverService.getSpaceForCommunityOrFail(
        community.id
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
    community: ICommunity,
    organizationID: string,
    role: CommunityRole
  ): Promise<IOrganization> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(organizationID);

    organization.agent = await this.assignContributorAgentToRole(
      community,
      agent,
      role,
      CommunityContributorType.ORGANIZATION
    );

    return organization;
  }

  async removeUserFromRole(
    community: ICommunity,
    userID: string,
    role: CommunityRole,
    validatePolicyLimits = true
  ): Promise<IUser> {
    const { user, agent } = await this.userService.getUserAndAgent(userID);

    user.agent = await this.removeContributorFromRole(
      community,
      agent,
      role,
      CommunityContributorType.USER,
      validatePolicyLimits
    );

    const parentCommunity = await this.communityService.getParentCommunity(
      community
    );
    if (role === CommunityRole.ADMIN && parentCommunity) {
      // Check if an admin anywhere else in the community
      const peerCommunities = await this.communityService.getPeerCommunites(
        parentCommunity,
        community
      );
      const hasAnotherAdminRole = peerCommunities.some(pc =>
        this.isInRole(agent, pc, CommunityRole.ADMIN)
      );

      if (!hasAnotherAdminRole) {
        await this.removeContributorToImplicitRole(
          parentCommunity,
          agent,
          CommunityRoleImplicit.SUBSPACE_ADMIN
        );
      }
    }

    if (role === CommunityRole.MEMBER) {
      await this.communityService.removeMemberFromCommunication(
        community,
        user
      );
    }

    return user;
  }

  async removeOrganizationFromRole(
    community: ICommunity,
    organizationID: string,
    role: CommunityRole,
    validatePolicyLimits = true
  ): Promise<IOrganization> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(organizationID);

    organization.agent = await this.removeContributorFromRole(
      community,
      agent,
      role,
      CommunityContributorType.ORGANIZATION,
      validatePolicyLimits
    );

    return organization;
  }

  async removeVirtualFromRole(
    community: ICommunity,
    virtualContributorID: string,
    role: CommunityRole,
    validatePolicyLimits = true
  ): Promise<IVirtualContributor> {
    const { virtualContributor, agent } =
      await this.virtualContributorService.getVirtualContributorAndAgent(
        virtualContributorID
      );

    virtualContributor.agent = await this.removeContributorFromRole(
      community,
      agent,
      role,
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
    community: ICommunity,
    communityPolicyRole: ICommunityRolePolicy,
    role: CommunityRole,
    action: CommunityContributorsUpdateType
  ) {
    const userMembersCount = await this.countContributorsPerRole(
      community,
      role,
      CommunityContributorType.USER
    );

    if (action === CommunityContributorsUpdateType.ASSIGN) {
      if (userMembersCount === communityPolicyRole.maxUser) {
        throw new CommunityPolicyRoleLimitsException(
          `Max limit of users reached for role '${role}': ${communityPolicyRole.maxUser}, cannot assign new user.`,
          LogContext.COMMUNITY
        );
      }
    }

    if (action === CommunityContributorsUpdateType.REMOVE) {
      if (userMembersCount === communityPolicyRole.minUser) {
        throw new CommunityPolicyRoleLimitsException(
          `Min limit of users reached for role '${role}': ${communityPolicyRole.minUser}, cannot remove user.`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async validateOrganizationCommunityPolicy(
    community: ICommunity,
    communityPolicyRole: ICommunityRolePolicy,
    role: CommunityRole,
    action: CommunityContributorsUpdateType
  ) {
    const orgMemberCount = await this.countContributorsPerRole(
      community,
      role,
      CommunityContributorType.ORGANIZATION
    );

    if (action === CommunityContributorsUpdateType.ASSIGN) {
      if (orgMemberCount === communityPolicyRole.maxOrg) {
        throw new CommunityPolicyRoleLimitsException(
          `Max limit of organizations reached for role '${role}': ${communityPolicyRole.maxOrg}, cannot assign new organization.`,
          LogContext.COMMUNITY
        );
      }
    }

    if (action === CommunityContributorsUpdateType.REMOVE) {
      if (orgMemberCount === communityPolicyRole.minOrg) {
        throw new CommunityPolicyRoleLimitsException(
          `Min limit of organizations reached for role '${role}': ${communityPolicyRole.minOrg}, cannot remove organization.`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  private async validateCommunityPolicyLimits(
    community: ICommunity,
    communityPolicyRole: ICommunityRolePolicy,
    role: CommunityRole,
    action: CommunityContributorsUpdateType,
    contributorType: CommunityContributorType
  ) {
    if (contributorType === CommunityContributorType.USER)
      await this.validateUserCommunityPolicy(
        community,
        communityPolicyRole,
        role,
        action
      );

    if (contributorType === CommunityContributorType.ORGANIZATION)
      await this.validateOrganizationCommunityPolicy(
        community,
        communityPolicyRole,
        role,
        action
      );
  }

  public async assignContributorAgentToRole(
    community: ICommunity,
    agent: IAgent,
    role: CommunityRole,
    contributorType: CommunityContributorType
  ): Promise<IAgent> {
    const communityPolicyRole = this.communityService.getCommunityPolicyForRole(
      community,
      role
    );
    await this.validateCommunityPolicyLimits(
      community,
      communityPolicyRole,
      role,
      CommunityContributorsUpdateType.ASSIGN,
      contributorType
    );

    return await this.agentService.grantCredential({
      agentID: agent.id,
      type: communityPolicyRole.credential.type,
      resourceID: communityPolicyRole.credential.resourceID,
    });
  }

  private async assignContributorToImplicitRole(
    community: ICommunity,
    agent: IAgent,
    role: CommunityRoleImplicit
  ): Promise<IAgent> {
    const credential = this.getCredentialForImplicitRole(community, role);

    return await this.agentService.grantCredential({
      agentID: agent.id,
      type: credential.type,
      resourceID: credential.resourceID,
    });
  }

  private async removeContributorToImplicitRole(
    community: ICommunity,
    agent: IAgent,
    role: CommunityRoleImplicit
  ): Promise<IAgent> {
    const credential = this.getCredentialForImplicitRole(community, role);

    return await this.agentService.revokeCredential({
      agentID: agent.id,
      type: credential.type,
      resourceID: credential.resourceID,
    });
  }

  private getCredentialForImplicitRole(
    community: ICommunity,
    role: CommunityRoleImplicit
  ): CredentialDefinition {
    // Use the admin credential to get the resourceID
    const adminCredential = this.getCredentialDefinitionForRole(
      community,
      CommunityRole.ADMIN
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
    community: ICommunity,
    agent: IAgent,
    role: CommunityRole,
    contributorType: CommunityContributorType,
    validatePolicyLimits: boolean
  ): Promise<IAgent> {
    const communityPolicyRole = this.communityService.getCommunityPolicyForRole(
      community,
      role
    );
    if (validatePolicyLimits) {
      await this.validateCommunityPolicyLimits(
        community,
        communityPolicyRole,
        role,
        CommunityContributorsUpdateType.REMOVE,
        contributorType
      );
    }

    return await this.agentService.revokeCredential({
      agentID: agent.id,
      type: communityPolicyRole.credential.type,
      resourceID: communityPolicyRole.credential.resourceID,
    });
  }

  async isMember(agent: IAgent, community: ICommunity): Promise<boolean> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      CommunityRole.MEMBER
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
    community: ICommunity,
    role: CommunityRole
  ): Promise<boolean> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
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
    community: ICommunity,
    role: CommunityRoleImplicit
  ): Promise<boolean> {
    const membershipCredential = this.getCredentialForImplicitRole(
      community,
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
    const community = await this.communityService.getCommunityOrFail(
      applicationData.parentID,
      {
        relations: { parentCommunity: true },
      }
    );

    await this.validateApplicationFromUser(user, agent, community);

    const application = await this.applicationService.createApplication(
      applicationData
    );
    application.community = community;
    return await this.applicationService.save(application);
  }

  async createInvitationExistingContributor(
    invitationData: CreateInvitationInput
  ): Promise<IInvitation> {
    const { contributor: contributor, agent } =
      await this.contributorService.getContributorAndAgent(
        invitationData.invitedContributor
      );
    const community = await this.communityService.getCommunityOrFail(
      invitationData.communityID,
      {
        relations: {},
      }
    );

    await this.validateInvitationToExistingContributor(
      contributor,
      agent,
      community
    );

    const invitation = await this.invitationService.createInvitation(
      invitationData,
      contributor
    );
    invitation.community = community;

    return await this.invitationService.save(invitation);
  }

  async createPlatformInvitation(
    invitationData: CreatePlatformInvitationOnCommunityInput,
    agentInfo: AgentInfo
  ): Promise<IPlatformInvitation> {
    await this.validateInvitationToExternalUser(
      invitationData.email,
      invitationData.communityID
    );
    const community = await this.communityService.getCommunityOrFail(
      invitationData.communityID,
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
    externalInvitation.community = community;
    return await this.platformInvitationService.save(externalInvitation);
  }

  private async validateApplicationFromUser(
    user: IUser,
    agent: IAgent,
    community: ICommunity
  ) {
    const openApplication = await this.findOpenApplication(
      user.id,
      community.id
    );
    if (openApplication) {
      throw new CommunityMembershipException(
        `An open application (ID: ${openApplication.id}) already exists for contributor ${openApplication.user?.id} on Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
    }

    const openInvitation = await this.findOpenInvitation(user.id, community.id);
    if (openInvitation) {
      throw new CommunityMembershipException(
        `An open invitation (ID: ${openInvitation.id}) already exists for contributor ${openInvitation.invitedContributor} (${openInvitation.contributorType}) on Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
    }

    // Check if the user is already a member; if so do not allow an application
    const isExistingMember = await this.isMember(agent, community);
    if (isExistingMember)
      throw new CommunityMembershipException(
        `Contributor ${user.nameID} is already a member of the Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
  }

  private async validateInvitationToExistingContributor(
    contributor: IContributor,
    agent: IAgent,
    community: ICommunity
  ) {
    const openInvitation = await this.findOpenInvitation(
      contributor.id,
      community.id
    );
    if (openInvitation) {
      throw new CommunityMembershipException(
        `An open invitation (ID: ${openInvitation.id}) already exists for contributor ${openInvitation.invitedContributor} (${openInvitation.contributorType}) on Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
    }

    const openApplication = await this.findOpenApplication(
      contributor.id,
      community.id
    );
    if (openApplication) {
      throw new CommunityMembershipException(
        `An open application (ID: ${openApplication.id}) already exists for contributor ${openApplication.user?.id} on Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
    }

    // Check if the user is already a member; if so do not allow an application
    const isExistingMember = await this.isMember(agent, community);
    if (isExistingMember)
      throw new CommunityMembershipException(
        `Contributor ${contributor.nameID} is already a member of the Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
  }

  private async validateInvitationToExternalUser(
    email: string,
    communityID: string
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
        platformInvitation.community &&
        platformInvitation.community.id === communityID
      ) {
        throw new CommunityMembershipException(
          `An invitation with the provided email address (${email}) already exists for the specified community: ${communityID}`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  async getApplications(community: ICommunity): Promise<IApplication[]> {
    const communityApps = await this.communityService.getCommunityOrFail(
      community.id,
      {
        relations: { applications: true },
      }
    );
    return communityApps?.applications || [];
  }

  async getInvitations(community: ICommunity): Promise<IInvitation[]> {
    const communityApps = await this.communityService.getCommunityOrFail(
      community.id,
      {
        relations: { invitations: true },
      }
    );
    return communityApps?.invitations || [];
  }

  async getPlatformInvitations(
    community: ICommunity
  ): Promise<IPlatformInvitation[]> {
    const communityApps = await this.communityService.getCommunityOrFail(
      community.id,
      {
        relations: { platformInvitations: true },
      }
    );
    return communityApps?.platformInvitations || [];
  }

  async getMembersCount(community: ICommunity): Promise<number> {
    const membershipCredential = this.getCredentialDefinitionForRole(
      community,
      CommunityRole.MEMBER
    );

    const credentialMatches =
      await this.agentService.countAgentsWithMatchingCredentials({
        type: membershipCredential.type,
        resourceID: membershipCredential.resourceID,
      });

    return credentialMatches;
  }
}
