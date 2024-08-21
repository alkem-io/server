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
import { UUID_LENGTH } from '@common/constants';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { IAgent } from '@domain/agent/agent';
import { AgentService } from '@domain/agent/agent/agent.service';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { CredentialsSearchInput } from '@domain/agent/credential/dto/credentials.dto.search';
import { OrganizationVerificationService } from '../organization-verification/organization.verification.service';
import { IOrganizationVerification } from '../organization-verification/organization.verification.interface';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
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
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { OrganizationRole } from '@common/enums/organization.role';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { applyOrganizationFilter } from '@core/filtering/filters/organizationFilter';
import { ICredentialDefinition } from '@domain/agent/credential/credential.definition.interface';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { OrganizationRoleService } from '../organization-role/organization.role.service';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AgentType } from '@common/enums/agent.type';
import { ContributorService } from '../contributor/contributor.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';

@Injectable()
export class OrganizationService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private organizationVerificationService: OrganizationVerificationService,
    private organizationRoleService: OrganizationRoleService,
    private agentService: AgentService,
    private userGroupService: UserGroupService,
    private profileService: ProfileService,
    private namingService: NamingService,
    private preferenceSetService: PreferenceSetService,
    private storageAggregatorService: StorageAggregatorService,
    private contributorService: ContributorService,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createOrganization(
    organizationData: CreateOrganizationInput,
    agentInfo?: AgentInfo
  ): Promise<IOrganization> {
    if (organizationData.nameID) {
      // Convert nameID to lower case
      organizationData.nameID = organizationData.nameID.toLowerCase();
      await this.checkNameIdOrFail(organizationData.nameID);
    } else {
      organizationData.nameID = await this.createOrganizationNameID(
        organizationData.profileData?.displayName
      );
    }
    await this.checkDisplayNameOrFail(
      organizationData.profileData?.displayName
    );

    const organization: IOrganization = Organization.create(organizationData);
    organization.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.ORGANIZATION
    );

    organization.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.ORGANIZATION
      );
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

    this.contributorService.addAvatarVisualToContributorProfile(
      organization.profile,
      organizationData.profileData,
      agentInfo,
      organizationData.profileData.displayName
    );

    organization.groups = [];

    organization.agent = await this.agentService.createAgent({
      type: AgentType.ORGANIZATION,
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
      await this.organizationRoleService.assignOrganizationRoleToUser({
        organizationID: savedOrg.id,
        userID: agentInfo.userID,
        role: OrganizationRole.ASSOCIATE,
      });
      await this.organizationRoleService.assignOrganizationRoleToUser({
        organizationID: savedOrg.id,
        userID: agentInfo.userID,
        role: OrganizationRole.ADMIN,
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
    const isSpaceHost = await this.isAccountHost(organization);
    if (isSpaceHost) {
      throw new ForbiddenException(
        'Unable to delete Organization: host of one or more accounts',
        LogContext.SPACES
      );
    }

    await this.organizationRoleService.removeAllRoles(organization);

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

  async isAccountHost(organization: IOrganization): Promise<boolean> {
    if (!organization.agent)
      throw new RelationshipNotFoundException(
        `Unable to load agent for organization: ${organization.id}`,
        LogContext.COMMUNITY
      );

    return await this.agentService.hasValidCredential(organization.agent.id, {
      type: AuthorizationCredential.ACCOUNT_HOST,
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

  private getCredentialForRole(
    role: OrganizationRole,
    organizationID: string
  ): ICredentialDefinition {
    const result: ICredentialDefinition = {
      type: '',
      resourceID: organizationID,
    };
    switch (role) {
      case OrganizationRole.ASSOCIATE:
        result.type = AuthorizationCredential.ORGANIZATION_ASSOCIATE;
        break;
      case OrganizationRole.ADMIN:
        result.type = AuthorizationCredential.ORGANIZATION_ADMIN;
        break;
      case OrganizationRole.OWNER:
        result.type = AuthorizationCredential.ORGANIZATION_OWNER;
        break;

      default:
        throw new ForbiddenException(
          `Role not supported: ${role}`,
          LogContext.AUTH
        );
    }
    return result;
  }

  async getMetrics(organization: IOrganization): Promise<INVP[]> {
    const activity: INVP[] = [];

    const membersCount =
      await this.organizationRoleService.getMembersCount(organization);
    const membersTopic = new NVP('associates', membersCount.toString());
    membersTopic.id = `associates-${organization.id}`;
    activity.push(membersTopic);

    return activity;
  }

  async createGroup(groupData: CreateUserGroupInput): Promise<IUserGroup> {
    const orgID = groupData.parentID;
    const groupName = groupData.profile.displayName;
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
        `No groups on organization: ${organization.id}`,
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
        `Unable to find preferenceSet for organization with nameID: ${orgWithPreferences.id}`,
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
        `Unable to find storageAggregator for Organization with nameID: ${organizationWithStorageAggregator.id}`,
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
        `Unable to load verification for organisation: ${organization.id}`,
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

  public async createOrganizationNameID(displayName: string): Promise<string> {
    const base = `${displayName}`;
    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInOrganizations(); // This will need to be smarter later
    return this.namingService.createNameIdAvoidingReservedNameIDs(
      base,
      reservedNameIDs
    );
  }
}
