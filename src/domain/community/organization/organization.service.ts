import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ForbiddenException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { ProfileService } from '@domain/community/profile/profile.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import {
  CreateOrganizationInput,
  DeleteOrganizationInput,
  IOrganization,
  Organization,
  UpdateOrganizationInput,
} from '@domain/community/organization';
import { CreateUserGroupInput, IUserGroup } from '@domain/community/user-group';
import { IUser } from '@domain/community/user';
import { UserService } from '@domain/community/user/user.service';
import { UUID_LENGTH } from '@common/constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAgent } from '@domain/agent/agent';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CredentialsSearchInput } from '@domain/agent/credential/credentials.dto.search';
import { RemoveOrganizationMemberInput } from './dto/organization.dto.remove.member';
import { AssignOrganizationMemberInput } from './dto/organization.dto.assign.member';
import { AssignOrganizationAdminInput } from './dto/organization.dto.assign.admin';
import { RemoveOrganizationAdminInput } from './dto/organization.dto.remove.admin';
import { RemoveOrganizationOwnerInput } from './dto/organization.dto.remove.owner';
import { AssignOrganizationOwnerInput } from './dto/organization.dto.assign.owner';
import { OrganizationVerificationService } from '../organization-verification/organization.verification.service';
import { IOrganizationVerification } from '../organization-verification/organization.verification.interface';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { AgentInfo } from '@core/authentication';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';

@Injectable()
export class OrganizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private organizationVerificationService: OrganizationVerificationService,
    private userService: UserService,
    private agentService: AgentService,
    private userGroupService: UserGroupService,
    private profileService: ProfileService,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createOrganization(
    organizationData: CreateOrganizationInput,
    agentInfo?: AgentInfo
  ): Promise<IOrganization> {
    // Convert nameID to lower case
    organizationData.nameID = organizationData.nameID.toLowerCase();
    await this.checkNameIdOrFail(organizationData.nameID);
    await this.checkDisplayNameOrFail(organizationData.displayName);

    const organization: IOrganization = Organization.create(organizationData);
    organization.authorization = new AuthorizationPolicy();
    organization.profile = await this.profileService.createProfile(
      organizationData.profileData
    );

    organization.groups = [];

    organization.agent = await this.agentService.createAgent({
      parentDisplayID: `organization-${organization.nameID}`,
    });

    const savedOrg = await this.organizationRepository.save(organization);
    this.logger.verbose?.(
      `Created new organization with id ${organization.id}`,
      LogContext.COMMUNITY
    );
    organization.verification =
      await this.organizationVerificationService.createOrganizationVerification(
        { organizationID: savedOrg.id }
      );
    // Assign the creating agent as both a member and admin
    if (agentInfo) {
      await this.assignMember({
        organizationID: savedOrg.id,
        userID: agentInfo.userID,
      });
      await this.assignOrganizationAdmin({
        organizationID: savedOrg.id,
        userID: agentInfo.userID,
      });
    }

    return await this.organizationRepository.save(organization);
  }

  async checkNameIdOrFail(nameID: string) {
    const organizationCount = await this.organizationRepository.count({
      nameID: nameID,
    });
    if (organizationCount >= 1)
      throw new ValidationException(
        `Organization: the provided nameID is already taken: ${nameID}`,
        LogContext.COMMUNITY
      );
  }

  async checkDisplayNameOrFail(
    newDisplayName?: string,
    existingDisplayName?: string
  ) {
    if (!newDisplayName) {
      return;
    }
    if (newDisplayName === existingDisplayName) {
      return;
    }
    const organizationCount = await this.organizationRepository.count({
      displayName: newDisplayName,
    });
    if (organizationCount >= 1)
      throw new ValidationException(
        `Organization: the provided displayName is already taken: ${newDisplayName}`,
        LogContext.COMMUNITY
      );
  }

  async updateOrganization(
    organizationData: UpdateOrganizationInput
  ): Promise<IOrganization> {
    const organization = await this.getOrganizationOrFail(organizationData.ID);

    await this.checkDisplayNameOrFail(
      organizationData.displayName,
      organization.displayName
    );

    // Merge in the data
    if (organizationData.displayName)
      organization.displayName = organizationData.displayName;

    // Check the tagsets
    if (organizationData.profileData && organization.profile) {
      organization.profile = await this.profileService.updateProfile(
        organizationData.profileData
      );
    }

    if (organizationData.nameID) {
      this.logger.verbose?.(
        `${organizationData.nameID} - ${organization.nameID}`,
        LogContext.COMMUNICATION
      );
      if (
        organizationData.nameID.toLowerCase() !==
        organization.nameID.toLowerCase()
      ) {
        // updating the nameID, check new value is allowed
        await this.checkNameIdOrFail(organizationData.nameID);
        organization.nameID = organizationData.nameID;
      }
    }

    if (organizationData.legalEntityName !== undefined) {
      organization.legalEntityName = organizationData.legalEntityName;
    }

    if (organizationData.domain !== undefined) {
      organization.domain = organizationData.domain;
    }

    if (organizationData.website !== undefined) {
      organization.website = organizationData.website;
    }

    if (organizationData.contactEmail !== undefined) {
      organization.contactEmail = organizationData.contactEmail;
    }

    return await this.organizationRepository.save(organization);
  }

  async deleteOrganization(
    deleteData: DeleteOrganizationInput
  ): Promise<IOrganization> {
    const orgID = deleteData.ID;
    const organization = await this.getOrganizationOrFail(orgID, {
      relations: ['profile', 'groups', 'agent', 'verification'],
    });
    const isHubHost = await this.isHubHost(organization);
    if (isHubHost) {
      throw new ForbiddenException(
        'Unable to delete Organization: host of one or more hubs',
        LogContext.CHALLENGES
      );
    }
    // Start by removing all issued org owner credentials in case this causes issues
    const owners = await this.getOwners(organization);
    for (const owner of owners) {
      await this.removeOrganizationOwner(
        {
          userID: owner.id,
          organizationID: organization.id,
        },
        false
      );
    }

    // Remove all issued membership credentials
    const members = await this.getMembers(organization);
    for (const member of members) {
      await this.removeMember({
        userID: member.id,
        organizationID: organization.id,
      });
    }

    // Remove all issued org admin credentials
    const admins = await this.getAdmins(organization);
    for (const admin of admins) {
      await this.removeOrganizationAdmin({
        userID: admin.id,
        organizationID: organization.id,
      });
    }

    if (organization.profile) {
      await this.profileService.deleteProfile(organization.profile.id);
    }

    if (organization.groups) {
      for (const group of organization.groups) {
        await this.userGroupService.removeUserGroup({
          ID: group.id,
        });
      }
    }

    if (organization.authorization) {
      await this.authorizationPolicyService.delete(organization.authorization);
    }

    if (organization.agent) {
      await this.agentService.deleteAgent(organization.agent.id);
    }

    if (organization.verification) {
      await this.organizationVerificationService.delete(
        organization.verification.id
      );
    }

    const result = await this.organizationRepository.remove(
      organization as Organization
    );
    result.id = orgID;
    return result;
  }

  async isHubHost(organization: IOrganization): Promise<boolean> {
    if (!organization.agent)
      throw new RelationshipNotFoundException(
        `Unable to load agent for organization: ${organization.id}`,
        LogContext.COMMUNITY
      );

    return await this.agentService.hasValidCredential(organization.agent.id, {
      type: AuthorizationCredential.HUB_HOST,
    });
  }

  async getOrganization(
    organizationID: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization | undefined> {
    let organization: IOrganization | undefined;
    if (organizationID.length === UUID_LENGTH) {
      organization = await this.organizationRepository.findOne(
        { id: organizationID },
        options
      );
    } else {
      // look up based on nameID
      organization = await this.organizationRepository.findOne(
        { nameID: organizationID },
        options
      );
    }
    return organization;
  }

  async getOrganizationOrFail(
    organizationID: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization> {
    const organization = await this.getOrganization(organizationID, options);
    if (!organization)
      throw new EntityNotFoundException(
        `Unable to find Organization with ID: ${organizationID}`,
        LogContext.CHALLENGES
      );
    return organization;
  }

  async getOrganizations(
    limit?: number,
    shuffle = false
  ): Promise<IOrganization[]> {
    this.logger.verbose?.(
      `Querying all organizations with limit: ${limit} and shuffle: ${shuffle}`,
      LogContext.COMMUNITY
    );
    const organizations: IOrganization[] =
      await this.organizationRepository.find();

    return limitAndShuffle(organizations, limit, shuffle);
  }

  async getActivity(organization: IOrganization): Promise<INVP[]> {
    const activity: INVP[] = [];

    const membersCount = await this.getMembersCount(organization);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${organization.id}`;
    activity.push(membersTopic);

    return activity;
  }

  async getMembersCount(organization: IOrganization): Promise<number> {
    const credentialMatches =
      await this.agentService.countAgentsWithMatchingCredentials({
        type: AuthorizationCredential.ORGANIZATION_MEMBER,
        resourceID: organization.id,
      });

    return credentialMatches;
  }

  async getMembers(organization: IOrganization): Promise<IUser[]> {
    return await this.userService.usersWithCredentials({
      type: AuthorizationCredential.ORGANIZATION_MEMBER,
      resourceID: organization.id,
    });
  }

  async getAdmins(organization: IOrganization): Promise<IUser[]> {
    return await this.userService.usersWithCredentials({
      type: AuthorizationCredential.ORGANIZATION_ADMIN,
      resourceID: organization.id,
    });
  }

  async getOwners(organization: IOrganization): Promise<IUser[]> {
    return await this.userService.usersWithCredentials({
      type: AuthorizationCredential.ORGANIZATION_OWNER,
      resourceID: organization.id,
    });
  }

  async createGroup(groupData: CreateUserGroupInput): Promise<IUserGroup> {
    const orgID = groupData.parentID;
    const groupName = groupData.name;
    // First find the Challenge
    this.logger.verbose?.(
      `Adding userGroup (${groupName}) to organization (${orgID})`
    );
    // Try to find the organization
    const organization = await this.getOrganizationOrFail(orgID, {
      relations: ['groups'],
    });

    const group = await this.userGroupService.addGroupWithName(
      organization,
      groupName
    );
    await this.organizationRepository.save(organization);

    return group;
  }

  async save(organization: IOrganization): Promise<IOrganization> {
    return await this.organizationRepository.save(organization);
  }

  async getAgent(organization: IOrganization): Promise<IAgent> {
    const organizationWithAgent = await this.getOrganizationOrFail(
      organization.id,
      {
        relations: ['agent'],
      }
    );
    const agent = organizationWithAgent.agent;
    if (!agent)
      throw new EntityNotInitializedException(
        `User Agent not initialized: ${organization.id}`,
        LogContext.AUTH
      );

    return agent;
  }

  async getUserGroups(organization: IOrganization): Promise<IUserGroup[]> {
    const organizationGroups = await this.getOrganizationOrFail(
      organization.id,
      {
        relations: ['groups'],
      }
    );
    const groups = organizationGroups.groups;
    if (!groups)
      throw new ValidationException(
        `No groups on organization: ${organization.displayName}`,
        LogContext.COMMUNITY
      );
    return groups;
  }

  async getOrganizationCount(): Promise<number> {
    return await this.organizationRepository.count();
  }

  async organizationsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<IOrganization[]> {
    const credResourceID = credentialCriteria.resourceID || '';
    const organizationMatches = await this.organizationRepository
      .createQueryBuilder('organization')
      .leftJoinAndSelect('organization.agent', 'agent')
      .leftJoinAndSelect('agent.credentials', 'credential')
      .where('credential.type = :type')
      .andWhere('credential.resourceID = :resourceID')
      .setParameters({
        type: `${credentialCriteria.type}`,
        resourceID: credResourceID,
      })
      .getMany();

    // reload to go through the normal loading path
    const results: IOrganization[] = [];
    for (const organization of organizationMatches) {
      const loadedOrganization = await this.getOrganizationOrFail(
        organization.id
      );
      results.push(loadedOrganization);
    }
    return results;
  }

  async assignMember(
    membershipData: AssignOrganizationMemberInput
  ): Promise<IOrganization> {
    const organization = await this.getOrganizationOrFail(
      membershipData.organizationID
    );

    // Assign a credential for community membership
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    user.agent = await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ORGANIZATION_MEMBER,
      resourceID: organization.id,
    });
    return organization;
  }

  async removeMember(
    membershipData: RemoveOrganizationMemberInput
  ): Promise<IOrganization> {
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    const organization = await this.getOrganizationOrFail(
      membershipData.organizationID
    );
    user.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ORGANIZATION_MEMBER,
      resourceID: organization.id,
    });

    return organization;
  }

  async assignOrganizationAdmin(
    assignData: AssignOrganizationAdminInput
  ): Promise<IUser> {
    const userID = assignData.userID;
    const agent = await this.userService.getAgent(userID);
    const organization = await this.getOrganizationOrFail(
      assignData.organizationID
    );

    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ORGANIZATION_ADMIN,
      resourceID: organization.id,
    });

    return await this.userService.getUserWithAgent(userID);
  }

  async removeOrganizationAdmin(
    removeData: RemoveOrganizationAdminInput
  ): Promise<IUser> {
    const organizationID = removeData.organizationID;
    const organization = await this.getOrganizationOrFail(organizationID);
    const agent = await this.userService.getAgent(removeData.userID);

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ORGANIZATION_ADMIN,
      resourceID: organization.id,
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  async assignOrganizationOwner(
    assignData: AssignOrganizationOwnerInput
  ): Promise<IUser> {
    const userID = assignData.userID;
    const agent = await this.userService.getAgent(userID);
    const organization = await this.getOrganizationOrFail(
      assignData.organizationID
    );

    await this.agentService.grantCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ORGANIZATION_OWNER,
      resourceID: organization.id,
    });

    return await this.userService.getUserWithAgent(userID);
  }

  async removeOrganizationOwner(
    removeData: RemoveOrganizationOwnerInput,
    checkAtLeastOneOwner = true
  ): Promise<IUser> {
    const organizationID = removeData.organizationID;
    const organization = await this.getOrganizationOrFail(organizationID);
    const agent = await this.userService.getAgent(removeData.userID);

    if (checkAtLeastOneOwner) {
      const orgOwners = await this.userService.usersWithCredentials({
        type: AuthorizationCredential.ORGANIZATION_OWNER,
        resourceID: organizationID,
      });
      if (orgOwners.length === 1)
        throw new ForbiddenException(
          `Not allowed to remove last owner for organisaiton: ${organization.displayName}`,
          LogContext.AUTH
        );
    }

    await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ORGANIZATION_OWNER,
      resourceID: organization.id,
    });

    return await this.userService.getUserWithAgent(removeData.userID);
  }

  async getVerification(
    organizationParent: IOrganization
  ): Promise<IOrganizationVerification> {
    const organization = await this.getOrganizationOrFail(
      organizationParent.id,
      {
        relations: ['verification'],
      }
    );
    if (!organization.verification) {
      throw new EntityNotFoundException(
        `Unable to load verification for organisation: ${organization.displayName}`,
        LogContext.COMMUNITY
      );
    }
    return organization.verification;
  }
}
