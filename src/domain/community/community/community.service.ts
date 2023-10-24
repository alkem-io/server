import {
  CreateApplicationInput,
  IApplication,
} from '@domain/community/application';
import { IUserGroup } from '@domain/community/user-group/user-group.interface';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { UserService } from '@domain/community/user/user.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  CommunityPolicyRoleLimitsException,
  EntityNotFoundException,
  EntityNotInitializedException,
  ValidationException,
} from '@common/exceptions';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, FindOptionsRelations, Repository } from 'typeorm';
import { IUser } from '@domain/community/user';
import { CreateUserGroupInput } from '@domain/community/user-group/dto';
import { Community, ICommunity } from '@domain/community/community';
import { ApplicationService } from '@domain/community/application/application.service';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CommunicationService } from '@domain/communication/communication/communication.service';
import { ICommunication } from '@domain/communication/communication';
import { LogContext } from '@common/enums/logging.context';
import { CommunityType } from '@common/enums/community.type';
import { OrganizationService } from '../organization/organization.service';
import { IOrganization } from '../organization/organization.interface';
import { IAgent } from '@domain/agent/agent/agent.interface';
import { CredentialDefinition } from '@domain/agent/credential/credential.definition';
import { CommunityRole } from '@common/enums/community.role';
import { CommunityContributorsUpdateType } from '@common/enums/community.contributors.update.type';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { ICommunityRolePolicy } from '../community-policy/community.policy.role.interface';
import { ICommunityPolicy } from '../community-policy/community.policy.interface';
import { ActivityInputMemberJoined } from '@services/adapters/activity-adapter/dto/activity.dto.input.member.joined';
import { ActivityAdapter } from '@services/adapters/activity-adapter/activity.adapter';
import { AgentInfo } from '@core/authentication';
import { CommunityPolicyService } from '../community-policy/community.policy.service';
import { ICommunityPolicyDefinition } from '../community-policy/community.policy.definition';
import { DiscussionCategoryCommunity } from '@common/enums/communication.discussion.category.community';
import { IForm } from '@domain/common/form/form.interface';
import { FormService } from '@domain/common/form/form.service';
import { CreateFormInput } from '@domain/common/form/dto/form.dto.create';
import { UpdateFormInput } from '@domain/common/form/dto/form.dto.update';
import { CommunityMembershipStatus } from '@common/enums/community.membership.status';
import { InvitationService } from '../invitation/invitation.service';
import { IInvitation } from '../invitation/invitation.interface';
import { CreateInvitationExternalUserOnCommunityInput } from './dto/community.dto.invite.external.user';
import { IInvitationExternal } from '../invitation.external';
import { InvitationExternalService } from '../invitation.external/invitation.external.service';
import { CreateInvitationExternalInput } from '../invitation.external/dto/invitation.external.dto.create';
import { CommunityResolverService } from '@services/infrastructure/entity-resolver/community.resolver.service';
import { CreateInvitationInput } from '../invitation/dto/invitation.dto.create';
import { CommunityMembershipException } from '@common/exceptions/community.membership.exception';
import { CommunityEventsService } from './community.service.events';
import { StorageAggregatorResolverService } from '@services/infrastructure/storage-aggregator-resolver/storage.aggregator.resolver.service';

@Injectable()
export class CommunityService {
  constructor(
    private activityAdapter: ActivityAdapter,
    private authorizationPolicyService: AuthorizationPolicyService,
    private agentService: AgentService,
    private userService: UserService,
    private organizationService: OrganizationService,
    private userGroupService: UserGroupService,
    private applicationService: ApplicationService,
    private invitationService: InvitationService,
    private invitationExternalService: InvitationExternalService,
    private communicationService: CommunicationService,
    private communityResolverService: CommunityResolverService,
    private communityEventsService: CommunityEventsService,
    private formService: FormService,
    private communityPolicyService: CommunityPolicyService,
    private storageAggregatorResolverService: StorageAggregatorResolverService,
    @InjectRepository(Community)
    private communityRepository: Repository<Community>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createCommunity(
    name: string,
    spaceID: string,
    type: CommunityType,
    policy: ICommunityPolicyDefinition,
    applicationFormData: CreateFormInput
  ): Promise<ICommunity> {
    const community: ICommunity = new Community(type);
    community.authorization = new AuthorizationPolicy();
    community.policy = await this.communityPolicyService.createCommunityPolicy(
      policy.member,
      policy.lead,
      policy.admin,
      policy.host
    );
    community.spaceID = spaceID;
    community.applicationForm = await this.formService.createForm(
      applicationFormData
    );

    community.applications = [];
    community.invitations = [];
    community.externalInvitations = [];

    community.groups = [];
    community.communication =
      await this.communicationService.createCommunication(
        name,
        spaceID,
        Object.values(DiscussionCategoryCommunity)
      );
    return await this.communityRepository.save(community);
  }

  async createGroup(groupData: CreateUserGroupInput): Promise<IUserGroup> {
    const communityID = groupData.parentID;
    const groupName = groupData.profileData.displayName;

    this.logger.verbose?.(
      `Adding userGroup (${groupName}) to Community (${communityID})`,
      LogContext.COMMUNITY
    );

    // Try to find the Community
    const community = await this.getCommunityOrFail(communityID, {
      relations: { groups: true },
    });

    const storageAggregator =
      await this.storageAggregatorResolverService.getStorageAggregatorForCommunity(
        community.id
      );
    const group = await this.userGroupService.addGroupWithName(
      community,
      groupName,
      storageAggregator,
      community.spaceID
    );
    await this.communityRepository.save(community);

    return group;
  }

  // Loads the group into the Community entity if not already present
  async getUserGroups(community: ICommunity): Promise<IUserGroup[]> {
    const communityWithGroups = await this.getCommunityOrFail(community.id, {
      relations: { groups: true },
    });
    if (!communityWithGroups.groups) {
      throw new EntityNotInitializedException(
        `Community not initialized: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return communityWithGroups.groups;
  }

  async getCommunityOrFail(
    communityID: string,
    options?: FindOneOptions<Community>
  ): Promise<ICommunity | never> {
    const community = await this.communityRepository.findOne({
      where: { id: communityID },
      ...options,
    });
    if (!community)
      throw new EntityNotFoundException(
        `Unable to find Community with ID: ${communityID}`,
        LogContext.COMMUNITY
      );
    return community;
  }

  async removeCommunity(communityID: string): Promise<boolean> {
    // Note need to load it in with all contained entities so can remove fully
    const community = await this.getCommunityOrFail(communityID, {
      relations: {
        applications: true,
        invitations: true,
        externalInvitations: true,
        groups: true,
        communication: true,
        applicationForm: true,
      },
    });

    // Remove all groups
    if (community.groups) {
      for (const group of community.groups) {
        await this.userGroupService.removeUserGroup({
          ID: group.id,
        });
      }
    }

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

    if (community.authorization)
      await this.authorizationPolicyService.delete(community.authorization);

    // Remove all applications
    if (community.applications) {
      for (const application of community.applications) {
        await this.applicationService.deleteApplication({
          ID: application.id,
        });
      }
    }

    // Remove all invitations
    if (community.invitations) {
      for (const invitation of community.invitations) {
        await this.invitationService.deleteInvitation({
          ID: invitation.id,
        });
      }
    }
    if (community.externalInvitations) {
      for (const externalInvitation of community.externalInvitations) {
        await this.invitationExternalService.deleteInvitationExternal({
          ID: externalInvitation.id,
        });
      }
    }

    if (community.communication) {
      await this.communicationService.removeCommunication(
        community.communication.id
      );
    }

    if (community.applicationForm) {
      await this.formService.removeForm(community.applicationForm);
    }

    if (community.policy) {
      await this.communityPolicyService.removeCommunityPolicy(community.policy);
    }

    await this.communityRepository.remove(community as Community);
    return true;
  }

  async save(community: ICommunity): Promise<ICommunity> {
    return await this.communityRepository.save(community);
  }

  async getParentCommunity(
    community: ICommunity
  ): Promise<ICommunity | undefined> {
    const communityWithParent = await this.getCommunityOrFail(community.id, {
      relations: { parentCommunity: true },
    });

    const parentCommunity = communityWithParent?.parentCommunity;
    if (parentCommunity) {
      return await this.getCommunityOrFail(parentCommunity.id);
    }
    return undefined;
  }

  async updateApplicationForm(
    community: ICommunity,
    formData: UpdateFormInput
  ): Promise<ICommunity> {
    const applicationForm = await this.getApplicationForm(community);
    community.applicationForm = await this.formService.updateForm(
      applicationForm,
      formData
    );
    return await this.save(community);
  }

  async setParentCommunity(
    community?: ICommunity,
    parentCommunity?: ICommunity
  ): Promise<ICommunity> {
    if (!community || !parentCommunity)
      throw new EntityNotInitializedException(
        'Community not set',
        LogContext.COMMUNITY
      );
    community.parentCommunity = parentCommunity;
    // Also update the communityPolicy
    community.policy =
      await this.communityPolicyService.inheritParentCredentials(
        this.getCommunityPolicy(parentCommunity),
        this.getCommunityPolicy(community)
      );
    return await this.communityRepository.save(community);
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
    if (openInvitation) return CommunityMembershipStatus.INVITATION_PENDING;

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
    userID: string,
    communityID: string
  ): Promise<IInvitation | undefined> {
    const invitations = await this.invitationService.findExistingInvitations(
      userID,
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

  public async getDisplayName(community: ICommunity): Promise<string> {
    return await this.communityResolverService.getDisplayNameForCommunityOrFail(
      community.id,
      community.type
    );
  }

  getCredentialDefinitionForRole(
    community: ICommunity,
    role: CommunityRole
  ): CredentialDefinition {
    const policyRole = this.getCommunityPolicyForRole(community, role);
    return policyRole.credential;
  }

  async assignUserToRole(
    community: ICommunity,
    userID: string,
    role: CommunityRole,
    agentInfo?: AgentInfo,
    triggerNewMemberEvents = false
  ): Promise<IUser> {
    const { user, agent } = await this.userService.getUserAndAgent(userID);
    const hasMemberRoleInParent = await this.isMemberInParentCommunity(
      agent,
      community.id
    );
    if (!hasMemberRoleInParent) {
      throw new ValidationException(
        `Unable to assign Agent (${agent.id}) to community (${community.id}): agent is not a member of parent community`,
        LogContext.CHALLENGES
      );
    }

    user.agent = await this.assignContributorToRole(
      community,
      agent,
      role,
      CommunityContributorType.USER
    );

    if (role === CommunityRole.MEMBER) {
      this.addMemberToCommunication(user, community);
      let triggeredUserID = userID;
      if (agentInfo) {
        triggeredUserID = agentInfo.userID;
      }
      const activityLogInput: ActivityInputMemberJoined = {
        triggeredBy: triggeredUserID,
        community: community,
        user: user,
      };
      await this.activityAdapter.memberJoined(activityLogInput);
      if (triggerNewMemberEvents && agentInfo) {
        const displayName = await this.getDisplayName(community);
        await this.communityEventsService.processCommunityNewMemberEvents(
          community,
          displayName,
          agentInfo
        );
      }
    }

    return user;
  }

  private async addMemberToCommunication(
    user: IUser,
    community: ICommunity
  ): Promise<void> {
    // register the user for the community rooms
    const communication = await this.getCommunication(community.id);
    this.communicationService
      .addUserToCommunications(communication, user.communicationID)
      .catch(error =>
        this.logger.error?.(
          `Unable to add user to community messaging (${community.id}): ${error}`,
          LogContext.COMMUNICATION
        )
      );
  }

  private async isMemberInParentCommunity(
    agent: IAgent,
    communityID: string
  ): Promise<boolean> {
    const community = await this.getCommunityOrFail(communityID, {
      relations: { parentCommunity: true },
    });

    // If the parent community is set, then check if the user is also a member there
    if (community.parentCommunity) {
      const isParentMember = await this.isMember(
        agent,
        community.parentCommunity
      );
      return isParentMember;
    }
    return true;
  }

  public getCommunityPolicy(community: ICommunity): ICommunityPolicy {
    const policy = community.policy;
    if (!policy) {
      throw new EntityNotInitializedException(
        `Unable to locate policy for community: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return policy;
  }

  async getCommunication(
    communityID: string,
    relations: FindOptionsRelations<ICommunity>[] = []
  ): Promise<ICommunication> {
    const community = await this.getCommunityOrFail(communityID, {
      relations: { communication: true, ...relations },
    });

    const communication = community.communication;
    if (!communication) {
      throw new EntityNotInitializedException(
        `Unable to locate communication for community: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return communication;
  }

  async assignOrganizationToRole(
    community: ICommunity,
    organizationID: string,
    role: CommunityRole
  ): Promise<IOrganization> {
    const { organization, agent } =
      await this.organizationService.getOrganizationAndAgent(organizationID);

    organization.agent = await this.assignContributorToRole(
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

    if (role === CommunityRole.MEMBER) {
      const communication = await this.getCommunication(community.id);
      this.communicationService
        .removeUserFromCommunications(communication, user)
        .catch(error =>
          this.logger.error?.(
            `Unable remove user from community messaging (${community.id}): ${error}`,
            LogContext.COMMUNICATION
          )
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

  private async assignContributorToRole(
    community: ICommunity,
    agent: IAgent,
    role: CommunityRole,
    contributorType: CommunityContributorType
  ): Promise<IAgent> {
    const communityPolicyRole = this.getCommunityPolicyForRole(community, role);
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

  private async removeContributorFromRole(
    community: ICommunity,
    agent: IAgent,
    role: CommunityRole,
    contributorType: CommunityContributorType,
    validatePolicyLimits: boolean
  ): Promise<IAgent> {
    const communityPolicyRole = this.getCommunityPolicyForRole(community, role);
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

  private getCommunityPolicyForRole(
    community: ICommunity,
    role: CommunityRole
  ): ICommunityRolePolicy {
    const policy = this.getCommunityPolicy(community);
    return this.communityPolicyService.getCommunityRolePolicy(policy, role);
  }

  public updateCommunityPolicyResourceID(
    community: ICommunity,
    resourceID: string
  ): Promise<ICommunityPolicy> {
    const policy = this.getCommunityPolicy(community);
    return this.communityPolicyService.updateCommunityPolicyResourceID(
      policy,
      resourceID
    );
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

  async getCommunities(spaceId: string): Promise<Community[]> {
    const communites = await this.communityRepository.find({
      where: { spaceID: spaceId },
    });
    return communites || [];
  }

  async createApplication(
    applicationData: CreateApplicationInput
  ): Promise<IApplication> {
    const { user, agent } = await this.userService.getUserAndAgent(
      applicationData.userID
    );
    const community = await this.getCommunityOrFail(applicationData.parentID, {
      relations: { applications: true, parentCommunity: true },
    });

    await this.validateApplicationFromUser(user, agent, community);

    const spaceID = community.spaceID;
    if (!spaceID)
      throw new EntityNotInitializedException(
        `Unable to locate containing space: ${community.id}`,
        LogContext.COMMUNITY
      );
    const application = await this.applicationService.createApplication(
      applicationData,
      spaceID
    );
    community.applications?.push(application);
    await this.communityRepository.save(community);

    return application;
  }

  async createInvitationExistingUser(
    invitationData: CreateInvitationInput
  ): Promise<IInvitation> {
    const { user, agent } = await this.userService.getUserAndAgent(
      invitationData.invitedUser
    );
    const community = await this.getCommunityOrFail(
      invitationData.communityID,
      {
        relations: { invitations: true },
      }
    );

    await this.validateInvitationToExistingUser(user, agent, community);

    const invitation = await this.invitationService.createInvitation(
      invitationData
    );
    community.invitations?.push(invitation);
    await this.communityRepository.save(community);

    return invitation;
  }

  async createInvitationExternalUser(
    invitationData: CreateInvitationExternalUserOnCommunityInput,
    agentInfo: AgentInfo
  ): Promise<IInvitationExternal> {
    await this.validateInvitationToExternalUser(
      invitationData.email,
      invitationData.communityID
    );
    const community = await this.getCommunityOrFail(
      invitationData.communityID,
      {
        relations: { externalInvitations: true },
      }
    );

    const externalInvitationInput: CreateInvitationExternalInput = {
      ...invitationData,
      createdBy: agentInfo.userID,
    };
    const externalInvitation =
      await this.invitationExternalService.createInvitationExternal(
        externalInvitationInput
      );
    community.externalInvitations?.push(externalInvitation);
    await this.communityRepository.save(community);

    return externalInvitation;
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
        `An open application (ID: ${openApplication.id}) already exists for user ${openApplication.user?.id} on Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
    }

    const openInvitation = await this.findOpenInvitation(user.id, community.id);
    if (openInvitation) {
      throw new CommunityMembershipException(
        `An open invitation (ID: ${openInvitation.id}) already exists for user ${openInvitation.invitedUser} on Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
    }

    // Check if the user is already a member; if so do not allow an application
    const isExistingMember = await this.isMember(agent, community);
    if (isExistingMember)
      throw new CommunityMembershipException(
        `User ${user.nameID} is already a member of the Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
  }

  private async validateInvitationToExistingUser(
    user: IUser,
    agent: IAgent,
    community: ICommunity
  ) {
    const openInvitation = await this.findOpenInvitation(user.id, community.id);
    if (openInvitation) {
      throw new CommunityMembershipException(
        `An open invitation (ID: ${openInvitation.id}) already exists for user ${openInvitation.invitedUser} on Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
    }

    const openApplication = await this.findOpenApplication(
      user.id,
      community.id
    );
    if (openApplication) {
      throw new CommunityMembershipException(
        `An open application (ID: ${openApplication.id}) already exists for user ${openApplication.user?.id} on Community: ${community.id}.`,
        LogContext.COMMUNITY
      );
    }

    // Check if the user is already a member; if so do not allow an application
    const isExistingMember = await this.isMember(agent, community);
    if (isExistingMember)
      throw new CommunityMembershipException(
        `User ${user.nameID} is already a member of the Community: ${community.id}.`,
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

    const existingExternalInvitations =
      await this.invitationExternalService.findInvitationExternalsForUser(
        email
      );
    for (const existingExternalInvitation of existingExternalInvitations) {
      if (existingExternalInvitation.community.id === communityID) {
        throw new CommunityMembershipException(
          `An invitation with the provided email address (${email}) already exists for the specified community: ${communityID}`,
          LogContext.COMMUNITY
        );
      }
    }
  }

  async getCommunityInNameableScopeOrFail(
    communityID: string,
    nameableScopeID: string
  ): Promise<ICommunity> {
    const community = await this.communityRepository.findOneBy({
      id: communityID,
      spaceID: nameableScopeID,
    });

    if (!community) {
      throw new EntityNotFoundException(
        `Unable to find Community with ID: ${communityID}`,
        LogContext.COMMUNITY
      );
    }

    return community;
  }

  async getApplications(community: ICommunity): Promise<IApplication[]> {
    const communityApps = await this.getCommunityOrFail(community.id, {
      relations: { applications: true },
    });
    return communityApps?.applications || [];
  }

  async getInvitations(community: ICommunity): Promise<IInvitation[]> {
    const communityApps = await this.getCommunityOrFail(community.id, {
      relations: { invitations: true },
    });
    return communityApps?.invitations || [];
  }

  async getExternalInvitations(
    community: ICommunity
  ): Promise<IInvitationExternal[]> {
    const communityApps = await this.getCommunityOrFail(community.id, {
      relations: { externalInvitations: true },
    });
    return communityApps?.externalInvitations || [];
  }

  async getApplicationForm(community: ICommunity): Promise<IForm> {
    const communityForm = await this.getCommunityOrFail(community.id, {
      relations: { applicationForm: true },
    });
    const applicationForm = communityForm.applicationForm;
    if (!applicationForm) {
      throw new EntityNotFoundException(
        `Unable to find Application Form for Community with ID: ${community.id}`,
        LogContext.COMMUNITY
      );
    }
    return applicationForm;
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

  async isSpaceCommunity(community: ICommunity): Promise<boolean> {
    const parentCommunity = await this.getParentCommunity(community);

    return parentCommunity === undefined;
  }
}
