import { LogContext, ProfileType } from '@common/enums';
import { AccountType } from '@common/enums/account.type';
import { ActorType } from '@common/enums/actor.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { OrganizationVerificationEnum } from '@common/enums/organization.verification';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  ForbiddenException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { ActorContext } from '@core/actor-context/actor.context';
import { OrganizationFilterInput } from '@core/filtering';
import { applyOrganizationFilter } from '@core/filtering/filters/organizationFilter';
import { PaginationArgs } from '@core/pagination';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { CreateRoleSetInput } from '@domain/access/role-set/dto/role.set.dto.create';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { actorDefaults } from '@domain/actor/actor/actor.defaults';
import { ActorQueryArgs } from '@domain/actor/actor/dto/actor.query.args';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { NVP } from '@domain/common/nvp/nvp.entity';
import { INVP } from '@domain/common/nvp/nvp.interface';
import { ProfileAvatarService } from '@domain/common/profile/profile.avatar.service';
import { ProfileService } from '@domain/common/profile/profile.service';
import { CreateReferenceInput } from '@domain/common/reference';
import {
  CreateOrganizationInput,
  DeleteOrganizationInput,
  UpdateOrganizationInput,
} from '@domain/community/organization/dto';
import { IUserGroup } from '@domain/community/user-group';
import { UserGroupService } from '@domain/community/user-group/user-group.service';
import { IAccount } from '@domain/space/account/account.interface';
import { AccountHostService } from '@domain/space/account.host/account.host.service';
import { AccountLookupService } from '@domain/space/account.lookup/account.lookup.service';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { UpdateOrganizationSettingsEntityInput } from '../organization-settings/dto/organization.settings.dto.update';
import { IOrganizationSettings } from '../organization-settings/organization.settings.interface';
import { OrganizationSettingsService } from '../organization-settings/organization.settings.service';
import { IOrganizationVerification } from '../organization-verification/organization.verification.interface';
import { OrganizationVerificationService } from '../organization-verification/organization.verification.service';
import { CreateUserGroupInput } from '../user-group/dto/user-group.dto.create';
import { organizationApplicationForm } from './definitions/organization.role.application.form';
import { organizationRoleDefinitions } from './definitions/organization.role.definitions';
import { Organization } from './organization.entity';
import { IOrganization } from './organization.interface';

@Injectable()
export class OrganizationService {
  constructor(
    private accountLookupService: AccountLookupService,
    private accountHostService: AccountHostService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private organizationVerificationService: OrganizationVerificationService,
    private organizationSettingsService: OrganizationSettingsService,
    private userGroupService: UserGroupService,
    private profileService: ProfileService,
    private namingService: NamingService,
    private storageAggregatorService: StorageAggregatorService,
    private profileAvatarService: ProfileAvatarService,
    private roleSetService: RoleSetService,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createOrganization(
    organizationData: CreateOrganizationInput,
    actorContext?: ActorContext
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

    let organization: IOrganization = Organization.create(organizationData);
    // nameID is a getter/setter delegating to actor, not a @Column on Organization,
    // so TypeORM's create() won't copy it from the input — set it explicitly.
    organization.nameID = organizationData.nameID!;
    organization.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.ORGANIZATION
    );

    const roleSetInput: CreateRoleSetInput = {
      roles: organizationRoleDefinitions,
      applicationForm: organizationApplicationForm,
      entryRoleName: RoleName.ASSOCIATE,
      type: RoleSetType.ORGANIZATION,
    };
    organization.roleSet =
      await this.roleSetService.createRoleSet(roleSetInput);
    organization.settings = this.getDefaultOrganizationSettings();

    organization.storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.ORGANIZATION
      );

    organizationData.profileData.referencesData =
      this.getDefaultContributorProfileReferences();

    organization.profile = await this.profileService.createProfile(
      organizationData.profileData,
      ProfileType.ORGANIZATION,
      organization.storageAggregator
    );
    await this.profileService.addOrUpdateTagsetOnProfile(organization.profile, {
      name: TagsetReservedName.KEYWORDS,
      tags: [],
    });
    await this.profileService.addOrUpdateTagsetOnProfile(organization.profile, {
      name: TagsetReservedName.CAPABILITIES,
      tags: [],
    });

    await this.profileAvatarService.addAvatarVisualToProfile(
      organization.profile,
      organizationData.profileData,
      undefined,
      organizationData.profileData.displayName
    );

    organization.groups = [];

    const account = await this.accountHostService.createAccount(
      AccountType.ORGANIZATION
    );
    organization.accountID = account.id;

    // Cache some of the contents before saving
    const roleSetBeforeSave = organization.roleSet;

    // Save Actor and Organization in a single transaction.
    // TypeORM's cascade through shared-PK @JoinColumn({ name: 'id' }) doesn't
    // reliably set FK columns, so we pre-save Actor explicitly.
    organization = await this.organizationRepository.manager.transaction(
      async mgr => {
        await mgr.save((organization as Organization).actor!);
        return await mgr.save(organization as Organization);
      }
    );
    this.logger.verbose?.(
      `Created new organization with id ${organization.id}`,
      LogContext.COMMUNITY
    );
    organization.verification =
      await this.organizationVerificationService.createOrganizationVerification(
        { organizationID: organization.id }
      );
    // Ensure the credentials have the right resourceID
    organization.roleSet = await this.roleSetService.updateRoleResourceID(
      roleSetBeforeSave,
      organization.id
    );
    organization = await this.save(organization);

    organization = await this.getOrganizationOrFail(organization.id, {
      relations: {
        roleSet: true,
        actor: { profile: true },
      },
    });
    if (!organization.roleSet || !organization.profile) {
      throw new RelationshipNotFoundException(
        `Unable to load roleSet during org creation: ${organization.id}`,
        LogContext.COMMUNITY
      );
    }

    // Assign the creating actor as both a member and admin
    if (actorContext) {
      await this.roleSetService.assignActorToRole(
        organization.roleSet,
        RoleName.ASSOCIATE,
        actorContext.actorID,
        actorContext,
        false
      );

      await this.roleSetService.assignActorToRole(
        organization.roleSet,
        RoleName.ADMIN,
        actorContext.actorID,
        actorContext,
        false
      );
    }

    const userID = actorContext?.actorID;
    await this.profileAvatarService.ensureAvatarIsStoredInLocalStorageBucket(
      organization.profile.id,
      userID
    );

    return await this.getOrganizationOrFail(organization.id);
  }

  public async getRoleSet(organization: IOrganization): Promise<IRoleSet> {
    const organizationWithRoleSet = await this.getOrganizationOrFail(
      organization.id,
      {
        relations: { roleSet: true },
      }
    );

    if (!organizationWithRoleSet.roleSet) {
      throw new EntityNotInitializedException(
        `Unable to locate RoleSet for organization: ${organization.id}`,
        LogContext.COMMUNITY
      );
    }
    return organizationWithRoleSet.roleSet;
  }

  private getDefaultOrganizationSettings(): IOrganizationSettings {
    const settings: IOrganizationSettings = {
      membership: {
        allowUsersMatchingDomainToJoin: false,
      },
      privacy: {
        // Note: not currently used but will be near term.
        contributionRolesPubliclyVisible: true,
      },
    };
    return settings;
  }

  async checkNameIdOrFail(nameID: string) {
    const organizationCount = await this.organizationRepository.count({
      where: { actor: { nameID: nameID } },
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
      actor: {
        profile: {
          displayName: newDisplayName,
        },
      },
    });
    if (organizationCount >= 1)
      throw new ValidationException(
        `Organization: the provided displayName is already taken: ${newDisplayName}`,
        LogContext.COMMUNITY
      );
  }

  public async updateOrganizationSettings(
    organization: IOrganization,
    settingsData: UpdateOrganizationSettingsEntityInput
  ): Promise<IOrganization> {
    organization.settings = this.organizationSettingsService.updateSettings(
      organization.settings,
      settingsData
    );
    return await this.save(organization);
  }

  async updateOrganization(
    organizationData: UpdateOrganizationInput
  ): Promise<IOrganization> {
    const organization = await this.getOrganizationOrFail(organizationData.ID, {
      relations: { actor: { profile: true } },
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
        actor: { profile: true },
        verification: true,
        groups: true,
        storageAggregator: true,
        roleSet: true,
      },
    });

    if (
      !organization.roleSet ||
      !organization.profile ||
      !organization.verification
    ) {
      throw new RelationshipNotFoundException(
        `Unable to delete org, missing relations: ${organization.id}`,
        LogContext.COMMUNITY
      );
    }
    // TODO: give additional feedback?
    const accountHasResources =
      await this.accountLookupService.areResourcesInAccount(
        organization.accountID
      );
    if (accountHasResources) {
      throw new ForbiddenException(
        'Unable to delete Organization: account contain one or more resources',
        LogContext.SPACES
      );
    }

    await this.profileService.deleteProfile(organization.profile.id);

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

    // Note: Credentials are on Actor (which Organization extends), will be deleted via cascade

    await this.organizationVerificationService.delete(
      organization.verification.id
    );

    await this.roleSetService.removeRoleSetOrFail(organization.roleSet.id);

    const result = await this.organizationRepository.remove(
      organization as Organization
    );
    result.id = orgID;
    return result;
  }

  async getOrganization(
    organizationID: string,
    options?: FindOneOptions<Organization>
  ): Promise<IOrganization | null> {
    const organization = await this.organizationRepository.findOne({
      ...options,
      where: { ...options?.where, id: organizationID },
    });

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

  public async getAccount(organization: IOrganization): Promise<IAccount> {
    return await this.accountLookupService.getAccountOrFail(
      organization.accountID
    );
  }

  async getOrganizations(args: ActorQueryArgs): Promise<IOrganization[]> {
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
        .leftJoin('organization.actor', 'actor')
        .leftJoinAndSelect('actor.credentials', 'credential')
        .where('credential.type IN (:...credentialsFilter)')
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
    filter?: OrganizationFilterInput,
    status?: OrganizationVerificationEnum
  ): Promise<IPaginatedType<IOrganization>> {
    const qb = this.organizationRepository.createQueryBuilder('organization');
    qb.leftJoinAndSelect(
      'organization.actor.authorization',
      'authorization_policy'
    );

    if (status) {
      qb.leftJoin('organization.verification', 'verification').where(
        'verification.status = :status',
        { status: status }
      );
    }

    if (filter) {
      applyOrganizationFilter(qb, filter);
    }

    return getPaginationResults(qb, paginationArgs);
  }

  async getMetrics(organization: IOrganization): Promise<INVP[]> {
    const activity: INVP[] = [];
    const roleSet = await this.getRoleSet(organization);

    const membersCount = await this.roleSetService.countActorsWithRole(
      roleSet,
      RoleName.ASSOCIATE,
      [ActorType.USER]
    );
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

  public async createOrganizationNameID(displayName: string): Promise<string> {
    const base = `${displayName}`;
    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInOrganizations(); // This will need to be smarter later
    return this.namingService.createNameIdAvoidingReservedNameIDs(
      base,
      reservedNameIDs
    );
  }

  private getDefaultContributorProfileReferences(): CreateReferenceInput[] {
    const references: CreateReferenceInput[] = [];
    const referenceTemplates = actorDefaults.references;

    if (referenceTemplates) {
      for (const referenceTemplate of referenceTemplates) {
        references.push({
          name: referenceTemplate.name,
          uri: referenceTemplate.uri,
          description: referenceTemplate.description,
        });
      }
    }

    return references;
  }
}
