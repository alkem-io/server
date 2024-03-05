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
import {
  AuthorizationCredential,
  LogContext,
  ProfileType,
} from '@common/enums';
import { ProfileService } from '@domain/common/profile/profile.service';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import {
  CreateOrganizationInput,
  DeleteOrganizationInput,
  UpdateOrganizationInput,
} from '@domain/community/organization/dto';
import { IUserGroup } from '@domain/community/user-group';
import { IUser } from '@domain/community/user';
import { UserService } from '@domain/community/user/user.service';
import { UUID_LENGTH } from '@common/constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAgent } from '@domain/agent/agent';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { RemoveOrganizationAssociateInput } from './dto/organization.dto.remove.associate';
import { AssignOrganizationAssociateInput } from './dto/organization.dto.assign.associate';
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
import { IPreferenceSet } from '@domain/common/preference-set';
import { PreferenceSetService } from '@domain/common/preference-set/preference.set.service';
import { PreferenceDefinitionSet } from '@common/enums/preference.definition.set';
import { PreferenceType } from '@common/enums/preference.type';
import { PaginationArgs } from '@core/pagination';
import { OrganizationFilterInput } from '@core/filtering';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { CreateUserGroupInput } from '../user-group/dto/user-group.dto.create';
import { ContributorQueryArgs } from '../contributor/dto/contributor.query.args';
import { Organization } from './organization.entity';
import { IOrganization } from './organization.interface';
import { VisualType } from '@common/enums/visual.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { OrganizationRole } from '@common/enums/organization.role';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { applyOrganizationFilter } from '@core/filtering/filters/organizationFilter';

@Injectable()
export class OrganizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private organizationVerificationService: OrganizationVerificationService,
    private userService: UserService,
    private agentService: AgentService,
    private userGroupService: UserGroupService,
    private profileService: ProfileService,
    private preferenceSetService: PreferenceSetService,
    private storageAggregatorService: StorageAggregatorService,
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
    await this.checkDisplayNameOrFail(
      organizationData.profileData?.displayName
    );

    const organization: IOrganization = Organization.create(organizationData);
    organization.authorization = new AuthorizationPolicy();

    organization.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator();
    organization.profile = await this.profileService.createProfile(
      organizationData.profileData,
      ProfileType.ORGANIZATION,
      organization.storageAggregator
    );
    await this.profileService.addTagsetOnProfile(organization.profile, {
      name: TagsetReservedName.KEYWORDS,
      tags: [],
    });
    await this.profileService.addTagsetOnProfile(organization.profile, {
      name: TagsetReservedName.CAPABILITIES,
      tags: [],
    });
    // Set the visuals
    let avatarURL = organizationData.profileData?.avatarURL;
    if (!avatarURL) {
      avatarURL = this.profileService.generateRandomAvatar(
        organization.profile.displayName,
        ''
      );
    }
    await this.profileService.addVisualOnProfile(
      organization.profile,
      VisualType.AVATAR,
      avatarURL
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

    organization.preferenceSet =
      await this.preferenceSetService.createPreferenceSet(
        PreferenceDefinitionSet.ORGANIZATION,
        this.createPreferenceDefaults()
      );

    return await this.organizationRepository.save(organization);
  }

  async checkNameIdOrFail(nameID: string) {
    const organizationCount = await this.organizationRepository.countBy({
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
    const organizationCount = await this.organizationRepository.countBy({
      profile: {
        displayName: newDisplayName,
      },
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
    const organization = await this.getOrganizationOrFail(organizationData.ID, {
      relations: { profile: true },
    });

    await this.checkDisplayNameOrFail(
      organizationData.profileData?.displayName,
      organization.profile.displayName
    );

    // Check the tagsets
    if (organizationData.profileData && organization.profile) {
      organization.profile = await this.profileService.updateProfile(
        organization.profile,
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
      relations: {
        preferenceSet: true,
        profile: true,
        agent: true,
        verification: true,
        groups: true,
        storageAggregator: true,
      },
    });
    const isSpaceHost = await this.isSpaceHost(organization);
    if (isSpaceHost) {
      throw new ForbiddenException(
        'Unable to delete Organization: host of one or more spaces',
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
    const members = await this.getAssociates(organization);
    for (const member of members) {
      await this.removeAssociate({
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

    if (organization.storageAggregator) {
      await this.storageAggregatorService.delete(
        organization.storageAggregator.id
      );
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

    if (organization.preferenceSet) {
      await this.preferenceSetService.deletePreferenceSet(
        organization.preferenceSet.id
      );
    }

    const result = await this.organizationRepository.remove(
      organization as Organization
    );
    result.id = orgID;
    return result;
  }

  async isSpaceHost(organization: IOrganization): Promise<boolean> {
    if (!organization.agent)
      throw new RelationshipNotFoundException(
        `Unable to load agent for organization: ${organization.id}`,
        LogContext.COMMUNITY
      );

    return await this.agentService.hasValidCredential(organization.agent.id, {
      type: AuthorizationCredential.SPACE_HOST,
    });
  }

  async getOrganization(
    organizationID: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization | null> {
    let organization: IOrganization | null;
    if (organizationID.length === UUID_LENGTH) {
      organization = await this.organizationRepository.findOne({
        ...options,
        where: { ...options?.where, id: organizationID },
      });
    } else {
      // look up based on nameID
      organization = await this.organizationRepository.findOne({
        ...options,
        where: { ...options?.where, nameID: organizationID },
      });
    }
    return organization;
  }

  async getOrganizationOrFail(
    organizationID: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization | never> {
    const organization = await this.getOrganization(organizationID, options);
    if (!organization)
      throw new EntityNotFoundException(
        `Unable to find Organization with ID: ${organizationID}`,
        LogContext.COMMUNITY
      );
    return organization;
  }

  async getOrganizationAndAgent(
    organizationID: string
  ): Promise<{ organization: IOrganization; agent: IAgent }> {
    const organization = await this.getOrganizationOrFail(organizationID, {
      relations: { agent: true },
    });

    if (!organization.agent) {
      throw new EntityNotInitializedException(
        `Organization Agent not initialized: ${organizationID}`,
        LogContext.AUTH
      );
    }
    return { organization: organization, agent: organization.agent };
  }

  async getOrganizations(args: ContributorQueryArgs): Promise<IOrganization[]> {
    const limit = args.limit;
    const shuffle = args.shuffle || false;
    this.logger.verbose?.(
      `Querying all organizations with limit: ${limit} and shuffle: ${shuffle}`,
      LogContext.COMMUNITY
    );

    const credentialsFilter = args.filter?.credentials;
    let organizations: IOrganization[] = [];
    if (credentialsFilter) {
      organizations = await this.organizationRepository
        .createQueryBuilder('organization')
        .leftJoinAndSelect('organization.agent', 'agent')
        .leftJoinAndSelect('agent.credentials', 'credential')
        .where('credential.type IN (:credentialsFilter)')
        .setParameters({
          credentialsFilter: credentialsFilter,
        })
        .getMany();
    } else {
      organizations = await this.organizationRepository.find();
    }

    return limitAndShuffle(organizations, limit, shuffle);
  }

  async getPaginatedOrganizations(
    paginationArgs: PaginationArgs,
    filter?: OrganizationFilterInput
  ): Promise<IPaginatedType<IOrganization>> {
    const qb = this.organizationRepository.createQueryBuilder('organization');
    if (filter) {
      applyOrganizationFilter(qb, filter);
    }

    return getPaginationResults(qb, paginationArgs);
  }

  async getMetrics(organization: IOrganization): Promise<INVP[]> {
    const activity: INVP[] = [];

    const membersCount = await this.getMembersCount(organization);
    const membersTopic = new NVP('associates', membersCount.toString());
    membersTopic.id = `associates-${organization.id}`;
    activity.push(membersTopic);

    return activity;
  }

  async getMembersCount(organization: IOrganization): Promise<number> {
    const credentialMatches =
      await this.agentService.countAgentsWithMatchingCredentials({
        type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
        resourceID: organization.id,
      });

    return credentialMatches;
  }

  async getAssociates(organization: IOrganization): Promise<IUser[]> {
    return await this.userService.usersWithCredentials({
      type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
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

  async getMyRoles(
    agentInfo: AgentInfo,
    organization: IOrganization
  ): Promise<OrganizationRole[]> {
    // Note: this code can clearly be optimized so that we hit the db once, but
    // for a first pass this should be ok
    const result: OrganizationRole[] = [];
    const agent = await this.agentService.getAgentOrFail(agentInfo.agentID);

    const isAdmin = await this.agentService.hasValidCredential(agent.id, {
      type: AuthorizationCredential.ORGANIZATION_ADMIN,
      resourceID: organization.id,
    });
    const isAssociate = await this.agentService.hasValidCredential(agent.id, {
      type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
      resourceID: organization.id,
    });
    const isOwner = await this.agentService.hasValidCredential(agent.id, {
      type: AuthorizationCredential.ORGANIZATION_OWNER,
      resourceID: organization.id,
    });
    if (isOwner) result.push(OrganizationRole.OWNER);
    if (isAdmin) result.push(OrganizationRole.ADMIN);
    if (isAssociate) result.push(OrganizationRole.ASSOCIATE);

    return result;
  }

  async createGroup(groupData: CreateUserGroupInput): Promise<IUserGroup> {
    const orgID = groupData.parentID;
    const groupName = groupData.profileData.displayName;
    // First find the Challenge
    this.logger.verbose?.(
      `Adding userGroup (${groupName}) to organization (${orgID})`
    );
    // Try to find the organization
    const organization = await this.getOrganizationOrFail(orgID, {
      relations: {
        groups: {
          profile: true,
        },
        storageAggregator: true,
      },
    });

    if (!organization.storageAggregator) {
      throw new EntityNotInitializedException(
        `Organization StorageAggregator not initialized: ${organization.id}`,
        LogContext.COMMUNITY
      );
    }
    const group = await this.userGroupService.addGroupWithName(
      organization,
      groupName,
      organization.storageAggregator
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
        relations: { agent: true },
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
        relations: {
          groups: {
            profile: true,
          },
        },
      }
    );
    const groups = organizationGroups.groups;
    if (!groups)
      throw new ValidationException(
        `No groups on organization: ${organization.nameID}`,
        LogContext.COMMUNITY
      );
    return groups;
  }

  async getPreferenceSetOrFail(orgId: string): Promise<IPreferenceSet> {
    const orgWithPreferences = await this.getOrganizationOrFail(orgId, {
      relations: {
        preferenceSet: {
          preferences: true,
        },
      },
    });
    const preferenceSet = orgWithPreferences.preferenceSet;

    if (!preferenceSet) {
      throw new EntityNotFoundException(
        `Unable to find preferenceSet for organization with nameID: ${orgWithPreferences.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return preferenceSet;
  }

  async getStorageAggregatorOrFail(
    organizationID: string
  ): Promise<IStorageAggregator> {
    const organizationWithStorageAggregator = await this.getOrganizationOrFail(
      organizationID,
      {
        relations: {
          storageAggregator: true,
        },
      }
    );
    const storageAggregator =
      organizationWithStorageAggregator.storageAggregator;

    if (!storageAggregator) {
      throw new EntityNotFoundException(
        `Unable to find storageAggregator for Organization with nameID: ${organizationWithStorageAggregator.nameID}`,
        LogContext.COMMUNITY
      );
    }

    return storageAggregator;
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

  async countOrganizationsWithCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    const credResourceID = credentialCriteria.resourceID || '';
    const organizationMatchesCount = await this.organizationRepository
      .createQueryBuilder('organization')
      .leftJoinAndSelect('organization.agent', 'agent')
      .leftJoinAndSelect('agent.credentials', 'credential')
      .where('credential.type = :type')
      .andWhere('credential.resourceID = :resourceID')
      .setParameters({
        type: `${credentialCriteria.type}`,
        resourceID: credResourceID,
      })
      .getCount();

    return organizationMatchesCount;
  }

  async assignMember(
    membershipData: AssignOrganizationAssociateInput
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
      type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
      resourceID: organization.id,
    });
    return organization;
  }

  async removeAssociate(
    membershipData: RemoveOrganizationAssociateInput
  ): Promise<IOrganization> {
    const { user, agent } = await this.userService.getUserAndAgent(
      membershipData.userID
    );

    const organization = await this.getOrganizationOrFail(
      membershipData.organizationID
    );
    user.agent = await this.agentService.revokeCredential({
      agentID: agent.id,
      type: AuthorizationCredential.ORGANIZATION_ASSOCIATE,
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
          `Not allowed to remove last owner for organisaiton: ${organization.nameID}`,
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
        relations: { verification: true },
      }
    );
    if (!organization.verification) {
      throw new EntityNotFoundException(
        `Unable to load verification for organisation: ${organization.nameID}`,
        LogContext.COMMUNITY
      );
    }
    return organization.verification;
  }

  createPreferenceDefaults(): Map<PreferenceType, string> {
    const defaults: Map<PreferenceType, string> = new Map();
    defaults.set(
      PreferenceType.AUTHORIZATION_ORGANIZATION_MATCH_DOMAIN,
      'false'
    );

    return defaults;
  }

  async getOrganizationByDomain(domain: string): Promise<IOrganization | null> {
    const org = await this.organizationRepository.findOneBy({ domain: domain });
    return org;
  }
}
