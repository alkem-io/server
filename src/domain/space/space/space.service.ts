import { UUID_LENGTH } from '@common/constants';
import { LogContext } from '@common/enums';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { IAgent } from '@domain/agent/agent';
import { CreateSpaceInput, DeleteSpaceInput } from '@domain/space/space';
import { INVP, NVP } from '@domain/common/nvp';
import { ICommunity } from '@domain/community/community';
import { IContext } from '@domain/context/context';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, In, Not, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Space } from './space.entity';
import { ISpace } from './space.interface';
import { UpdateSpaceInput } from './dto/space.dto.update';
import { CreateSubspaceInput } from './dto/space.dto.create.subspace';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { SpacesQueryArgs } from './dto/space.args.query.spaces';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { IProfile } from '@domain/common/profile/profile.interface';
import { InnovationHub, InnovationHubType } from '@domain/innovation-hub/types';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';
import { PaginationArgs } from '@core/pagination';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { SpaceType } from '@common/enums/space.type';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { VisualType } from '@common/enums/visual.type';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { ProfileService } from '@domain/common/profile/profile.service';
import { CommunityService } from '@domain/community/community/community.service';
import { CreateCommunityInput } from '@domain/community/community/dto/community.dto.create';
import { ContextService } from '@domain/context/context/context.service';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { SpaceDefaultsService } from '../space.defaults/space.defaults.service';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { UpdateSpaceSettingsEntityInput } from '../space.settings/dto/space.settings.dto.update';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoleType } from '@common/enums/role.type';
import { SpaceLevel } from '@common/enums/space.level';
import { UpdateSpaceSettingsInput } from './dto/space.dto.update.settings';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { RoleSetContributorType } from '@common/enums/role.set.contributor.type';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { AgentType } from '@common/enums/agent.type';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { ISpaceSubscription } from './space.license.subscription.interface';
import { IAccount } from '../account/account.interface';
import { LicensingCredentialBasedPlanType } from '@common/enums/licensing.credential.based.plan.type';
import { TemplateType } from '@common/enums/template.type';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { CreateTemplateDefaultInput } from '@domain/template/template-default/dto/template.default.dto.create';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { CreateTemplatesManagerInput } from '@domain/template/templates-manager/dto/templates.manager.dto.create';
import { ITemplatesManager } from '@domain/template/templates-manager';
import { Activity } from '@platform/activity';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseService } from '@domain/common/license/license.service';
import { LicenseType } from '@common/enums/license.type';
import { getDiff, hasOnlyAllowedFields } from '@common/utils';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';
import { AccountLookupService } from '../account.lookup/account.lookup.service';

const EXPLORE_SPACES_LIMIT = 30;
const EXPLORE_SPACES_ACTIVITY_DAYS_OLD = 30;

type SpaceSortingData = {
  id: string;
  subspacesCount: number;
  visibility: SpaceVisibility;
  accessModeIsPublic: boolean;
};

@Injectable()
export class SpaceService {
  constructor(
    private accountLookupService: AccountLookupService,
    private authorizationPolicyService: AuthorizationPolicyService,
    private spacesFilterService: SpaceFilterService,
    private contextService: ContextService,
    private agentService: AgentService,
    private communityService: CommunityService,
    private roleSetService: RoleSetService,
    private namingService: NamingService,
    private profileService: ProfileService,
    private spaceSettingsService: SpaceSettingsService,
    private spaceDefaultsService: SpaceDefaultsService,
    private storageAggregatorService: StorageAggregatorService,
    private templatesManagerService: TemplatesManagerService,
    private collaborationService: CollaborationService,
    private licensingFrameworkService: LicensingFrameworkService,
    private licenseService: LicenseService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createSpace(
    spaceData: CreateSpaceInput,
    agentInfo?: AgentInfo
  ): Promise<ISpace> {
    if (!spaceData.type) {
      // default to match the level if not specified
      switch (spaceData.level) {
        case SpaceLevel.SPACE:
          spaceData.type = SpaceType.SPACE;
          break;
        case SpaceLevel.CHALLENGE:
          spaceData.type = SpaceType.CHALLENGE;
          break;
        case SpaceLevel.OPPORTUNITY:
          spaceData.type = SpaceType.OPPORTUNITY;
          break;
        default:
          spaceData.type = SpaceType.CHALLENGE;
          break;
      }
    }
    // Hard code / overwrite for now for root space level
    if (
      spaceData.level === SpaceLevel.SPACE &&
      spaceData.type !== SpaceType.SPACE
    ) {
      throw new NotSupportedException(
        `Root space must have a type of SPACE: '${spaceData.type}'`,
        LogContext.SPACES
      );
    }

    const space: ISpace = Space.create(spaceData);
    // default to demo space
    space.visibility = SpaceVisibility.ACTIVE;

    space.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.SPACE
    );
    space.settings = this.spaceDefaultsService.getDefaultSpaceSettings(
      spaceData.type
    );

    const storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.SPACE,
        spaceData.storageAggregatorParent
      );
    space.storageAggregator = storageAggregator;

    space.license = this.licenseService.createLicense({
      type: LicenseType.SPACE,
      entitlements: [
        {
          type: LicenseEntitlementType.SPACE_FREE,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_PLUS,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_PREMIUM,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_FLAG_SAVE_AS_TEMPLATE,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_FLAG_VIRTUAL_CONTRIBUTOR_ACCESS,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: false,
        },
        {
          type: LicenseEntitlementType.SPACE_FLAG_WHITEBOARD_MULTI_USER,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: true,
        },
      ],
    });

    const roleSetRolesData = this.spaceDefaultsService.getRoleSetCommunityRoles(
      space.level
    );
    const applicationFormData =
      this.spaceDefaultsService.getRoleSetCommunityApplicationForm(space.level);

    const communityData: CreateCommunityInput = {
      name: spaceData.profileData.displayName,
      roleSetData: {
        roles: roleSetRolesData,
        applicationForm: applicationFormData,
        entryRoleType: RoleType.MEMBER,
      },
      guidelines: {
        // TODO: get this from defaults service
        profile: {
          displayName: spaceData.profileData.displayName,
          description: spaceData.profileData.description,
        },
      },
    };

    space.community = await this.communityService.createCommunity(
      communityData,
      storageAggregator
    );

    space.context = this.contextService.createContext(spaceData.context);

    const profileType = this.spaceDefaultsService.getProfileType(space.level);
    space.profile = await this.profileService.createProfile(
      spaceData.profileData,
      profileType,
      space.storageAggregator
    );
    await this.profileService.addTagsetOnProfile(space.profile, {
      name: TagsetReservedName.DEFAULT,
      tags: spaceData.tags,
    });

    // add the visuals
    this.profileService.addVisualOnProfile(space.profile, VisualType.AVATAR);
    this.profileService.addVisualOnProfile(space.profile, VisualType.BANNER);
    this.profileService.addVisualOnProfile(space.profile, VisualType.CARD);

    space.levelZeroSpaceID = '';
    // save the collaboration and all it's template sets
    await this.save(space);

    if (spaceData.level === SpaceLevel.SPACE) {
      space.levelZeroSpaceID = space.id;
    }

    //// Collaboration
    let collaborationData: CreateCollaborationInput =
      spaceData.collaborationData;
    collaborationData.isTemplate = false;
    // Pick up the default template that is applicable
    collaborationData =
      await this.spaceDefaultsService.createCollaborationInput(
        collaborationData,
        space.type,
        spaceData.templatesManagerParent
      );
    space.collaboration = await this.collaborationService.createCollaboration(
      collaborationData,
      space.storageAggregator,
      agentInfo
    );

    space.agent = await this.agentService.createAgent({
      type: AgentType.SPACE,
    });

    if (space.level === SpaceLevel.SPACE) {
      space.templatesManager = await this.createTemplatesManager();
    }

    // Community:
    // set immediate community parent + resourceID
    if (!space.community || !space.community.roleSet) {
      throw new RelationshipNotFoundException(
        `Unable to load Community with RoleSet: ${space.id}`,
        LogContext.SPACES
      );
    }
    space.community.parentID = space.id;
    space.community.roleSet = await this.roleSetService.updateRoleResourceID(
      space.community.roleSet,
      space.id
    );

    return await this.save(space);
  }

  private async createTemplatesManager(): Promise<ITemplatesManager> {
    const templateDefaultData: CreateTemplateDefaultInput = {
      type: TemplateDefaultType.SPACE_SUBSPACE,
      allowedTemplateType: TemplateType.COLLABORATION,
    };
    const templatesManagerData: CreateTemplatesManagerInput = {
      templateDefaultsData: [templateDefaultData],
    };

    const templatesManager =
      await this.templatesManagerService.createTemplatesManager(
        templatesManagerData
      );
    return templatesManager;
  }

  async save(space: ISpace): Promise<ISpace> {
    return await this.spaceRepository.save(space);
  }

  async deleteSpaceOrFail(
    deleteData: DeleteSpaceInput
  ): Promise<ISpace | never> {
    const space = await this.getSpaceOrFail(deleteData.ID, {
      relations: {
        subspaces: true,
        collaboration: true,
        community: true,
        context: true,
        agent: true,
        profile: true,
        storageAggregator: true,
        templatesManager: true,
        license: true,
      },
    });

    if (
      !space.subspaces ||
      !space.collaboration ||
      !space.community ||
      !space.context ||
      !space.agent ||
      !space.profile ||
      !space.storageAggregator ||
      !space.authorization ||
      !space.license
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to delete Space: ${space.id} `,
        LogContext.SPACES
      );
    }

    // Do not remove a space that has subspaces, require these to be individually first removed
    if (space.subspaces.length > 0) {
      throw new OperationNotAllowedException(
        `Unable to remove Space (${space.id}), with level ${space.level}, as it contains ${space.subspaces.length} subspaces`,
        LogContext.SPACES
      );
    }

    await this.contextService.removeContext(space.context.id);
    await this.collaborationService.deleteCollaborationOrFail(
      space.collaboration.id
    );
    await this.communityService.removeCommunityOrFail(space.community.id);
    await this.profileService.deleteProfile(space.profile.id);
    await this.agentService.deleteAgent(space.agent.id);
    await this.licenseService.removeLicenseOrFail(space.license.id);
    await this.authorizationPolicyService.delete(space.authorization);

    if (space.level === SpaceLevel.SPACE) {
      if (!space.templatesManager || !space.templatesManager) {
        throw new RelationshipNotFoundException(
          `Unable to load entities to delete base subspace: ${space.id} `,
          LogContext.SPACES
        );
      }
      await this.templatesManagerService.deleteTemplatesManager(
        space.templatesManager.id
      );
    }

    await this.storageAggregatorService.delete(space.storageAggregator.id);

    const result = await this.spaceRepository.remove(space as Space);
    result.id = deleteData.ID;
    return result;
  }

  public async getSpacesForInnovationHub({
    id,
    type,
    spaceListFilter,
    spaceVisibilityFilter,
  }: InnovationHub): Promise<Space[]> | never {
    if (type === InnovationHubType.VISIBILITY) {
      if (!spaceVisibilityFilter) {
        throw new EntityNotInitializedException(
          `'spaceVisibilityFilter' of Innovation Hub '${id}' not defined`,
          LogContext.INNOVATION_HUB
        );
      }

      return this.spaceRepository.findBy({
        visibility: spaceVisibilityFilter,
        level: SpaceLevel.SPACE,
      });
    }

    if (type === InnovationHubType.LIST) {
      if (!spaceListFilter) {
        throw new EntityNotInitializedException(
          `'spaceListFilter' of Innovation Hub '${id}' not defined`,
          LogContext.INNOVATION_HUB
        );
      }

      const unsortedSpaces = await this.spaceRepository.findBy([
        { id: In(spaceListFilter) },
      ]);
      // sort according to the order of the space list filter
      return unsortedSpaces.sort(
        (a, b) => spaceListFilter.indexOf(a.id) - spaceListFilter.indexOf(b.id)
      );
    }

    throw new NotSupportedException(
      `Unsupported Innovation Hub type: '${type}'`,
      LogContext.INNOVATION_HUB
    );
  }

  /***
   * Checks if Spaces exists against a list of IDs
   * @param ids List of Space ids
   * @returns  <i>true</i> if all Spaces exist; list of ids of the Spaces that doesn't, otherwise
   */
  public async spacesExist(ids: string[]): Promise<true | string[]> {
    if (!ids.length) {
      return true;
    }

    const spaces = await this.spaceRepository.find({
      where: { id: In(ids) },
      select: { id: true },
    });

    if (!spaces.length) {
      return ids;
    }

    const notExist = [...ids];

    spaces.forEach(space => {
      const idIndex = notExist.findIndex(x => x === space.id);

      if (idIndex >= -1) {
        notExist.splice(idIndex, 1);
      }
    });

    return notExist.length > 0 ? notExist : true;
  }

  async getSpacesSorted(
    args: SpacesQueryArgs,
    options?: FindManyOptions<Space>
  ): Promise<ISpace[]> {
    const spaces = await this.getSpacesUnsorted(args, options);

    if (spaces.length === 0) return spaces;

    return await this.orderSpacesDefault(spaces);
  }

  async getSpacesUnsorted(
    args: SpacesQueryArgs,
    options?: FindManyOptions<Space>
  ): Promise<ISpace[]> {
    const visibilities = this.spacesFilterService.getAllowedVisibilities(
      args.filter
    );
    // Load the spaces
    let spaces: ISpace[];
    if (args && args.IDs) {
      spaces = await this.spaceRepository.find({
        where: {
          id: In(args.IDs),
          level: SpaceLevel.SPACE,
          visibility: In(visibilities),
        },
        ...options,
      });
    } else {
      spaces = await this.spaceRepository.find({
        where: {
          visibility: In(visibilities),
          level: SpaceLevel.SPACE,
        },
        ...options,
      });
    }

    if (spaces.length === 0) return [];

    return spaces;
  }

  public async getSpacesInList(spaceIDs: string[]): Promise<ISpace[]> {
    const visibilities = [SpaceVisibility.ACTIVE, SpaceVisibility.DEMO];

    const spaces = await this.spaceRepository.find({
      where: {
        id: In(spaceIDs),
        visibility: In(visibilities),
      },
      relations: {
        parentSpace: true,
        collaboration: true,
      },
    });

    if (spaces.length === 0) return [];

    return spaces;
  }

  public async orderSpacesDefault(spaces: ISpace[]): Promise<ISpace[]> {
    // Get the order to return the data in
    const sortedIDs = await this.getSpacesWithSortOrderDefault(
      spaces.flatMap(x => x.id)
    );
    const spacesResult: ISpace[] = [];
    for (const spaceID of sortedIDs) {
      const space = spaces.find(space => space.id === spaceID);
      if (space) {
        spacesResult.push(space);
      } else {
        this.logger.error(
          'Invalid state error when sorting Spaces!',
          undefined,
          LogContext.SPACES
        );
      }
    }
    return spacesResult;
  }

  getPaginatedSpaces(
    paginationArgs: PaginationArgs,
    filter?: SpaceFilterInput
  ): Promise<IPaginatedType<ISpace>> {
    const visibilities =
      this.spacesFilterService.getAllowedVisibilities(filter);

    const qb = this.spaceRepository.createQueryBuilder('space');
    if (visibilities) {
      qb.leftJoinAndSelect('space.authorization', 'authorization');
      qb.where({
        level: SpaceLevel.SPACE,
        visibility: In(visibilities),
      });
    }

    return getPaginationResults(qb, paginationArgs);
  }

  private async getSpacesWithSortOrderDefault(
    IDs: string[]
  ): Promise<string[]> {
    // Then load data to do the sorting
    const qb = this.spaceRepository.createQueryBuilder('space');

    qb.leftJoinAndSelect('space.subspaces', 'subspace');
    qb.leftJoinAndSelect('space.authorization', 'authorization_policy');
    qb.leftJoinAndSelect('subspace.subspaces', 'subspaces');
    qb.where({
      level: SpaceLevel.SPACE,
      id: In(IDs),
    });
    const spacesDataForSorting = await qb.getMany();

    return this.sortSpacesDefault(spacesDataForSorting);
  }

  private sortSpacesDefault(spacesData: Space[]): string[] {
    const spacesDataForSorting: SpaceSortingData[] = [];
    for (const space of spacesData) {
      const settings = space.settings;
      let subspacesCount = 0;
      if (space.subspaces) {
        subspacesCount = this.getSubspaceAndSubsubspacesCount(space.subspaces);
      }
      const spaceSortingData: SpaceSortingData = {
        id: space.id,
        visibility: space.visibility,
        accessModeIsPublic: settings.privacy.mode === SpacePrivacyMode.PUBLIC,
        subspacesCount,
      };
      spacesDataForSorting.push(spaceSortingData);
    }
    const sortedSpaces = spacesDataForSorting.sort((a, b) => {
      if (
        a.visibility !== b.visibility &&
        (a.visibility === SpaceVisibility.DEMO ||
          b.visibility === SpaceVisibility.DEMO)
      )
        return a.visibility === SpaceVisibility.DEMO ? 1 : -1;

      if (a.accessModeIsPublic && !b.accessModeIsPublic) return -1;
      if (!a.accessModeIsPublic && b.accessModeIsPublic) return 1;

      if (a.subspacesCount > b.subspacesCount) return -1;
      if (a.subspacesCount < b.subspacesCount) return 1;

      return 0;
    });
    const sortedIDs: string[] = [];
    for (const space of sortedSpaces) {
      sortedIDs.push(space.id);
    }
    return sortedIDs;
  }

  private getSubspaceAndSubsubspacesCount(subspaces: ISpace[]): number {
    let subspacesCount = 0;
    for (const subspace of subspaces) {
      subspacesCount++;

      if (subspace.subspaces) subspacesCount += subspace.subspaces.length;
    }
    return subspacesCount;
  }

  public getSpacesByVisibilities(
    spaceIds: string[],
    visibilities: SpaceVisibility[] = []
  ) {
    return this.spaceRepository.find({
      where: {
        id: In(spaceIds),
        visibility: visibilities.length ? In(visibilities) : undefined,
      },
    });
  }

  public getSpacesById(
    spaceIdsOrNameIds: string[],
    options?: FindManyOptions<Space>
  ) {
    return this.spaceRepository.find({
      ...options,
      where: options?.where
        ? Array.isArray(options.where)
          ? [
              { id: In(spaceIdsOrNameIds) },
              { nameID: In(spaceIdsOrNameIds) },
              ...options.where,
            ]
          : [
              { id: In(spaceIdsOrNameIds) },
              { nameID: In(spaceIdsOrNameIds) },
              options.where,
            ]
        : [{ id: In(spaceIdsOrNameIds) }, { nameID: In(spaceIdsOrNameIds) }],
    });
  }

  async getSpaceOrFail(
    spaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | never> {
    const space = await this.getSpace(spaceID, options);
    if (!space)
      throw new EntityNotFoundException(
        `Unable to find Space with ID: ${spaceID} using options '${JSON.stringify(
          options
        )}`,
        LogContext.SPACES
      );
    return space;
  }

  public getExploreSpaces(
    limit = EXPLORE_SPACES_LIMIT,
    daysOld = EXPLORE_SPACES_ACTIVITY_DAYS_OLD
  ): Promise<ISpace[]> {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - daysOld);

    return (
      this.spaceRepository
        .createQueryBuilder('s')
        .leftJoinAndSelect('s.authorization', 'authorization') // eager load the authorization
        .innerJoin(Activity, 'a', 's.collaborationId = a.collaborationID')
        .where({
          level: SpaceLevel.SPACE,
          visibility: SpaceVisibility.ACTIVE,
        })
        // activities in the past "daysOld" days
        .andWhere('a.createdDate >= :daysAgo', { daysAgo })
        .groupBy('s.id')
        .orderBy('COUNT(a.id)', 'DESC')
        .limit(limit)
        .getMany()
    );
  }

  async getSpace(
    spaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | null> {
    let space: ISpace | null = null;
    const { where, ...restOfOptions } = options ?? {};
    if (spaceID.length === UUID_LENGTH) {
      space = await this.spaceRepository.findOne({
        where: where ? { ...where, id: spaceID } : { id: spaceID },
        ...restOfOptions,
      });
    }
    if (!space) {
      // look up based on nameID
      space = await this.spaceRepository.findOne({
        where: where ? { ...where, nameID: spaceID } : { nameID: spaceID },
        ...restOfOptions,
      });
    }
    return space;
  }

  public async getAllSpaces(
    options?: FindManyOptions<ISpace>
  ): Promise<ISpace[]> {
    return this.spaceRepository.find(options);
  }

  public async updateSpacePlatformSettings(
    space: ISpace,
    updateData: UpdateSpacePlatformSettingsInput
  ): Promise<ISpace> {
    if (updateData.visibility && updateData.visibility !== space.visibility) {
      // Only update visibility on L0 spaces
      if (space.level !== SpaceLevel.SPACE) {
        throw new ValidationException(
          `Unable to update visibility on Space ${space.id} as it is not a L0 space`,
          LogContext.SPACES
        );
      }
      await this.updateSpaceVisibilityAllSubspaces(
        space.id,
        updateData.visibility
      );

      space.visibility = updateData.visibility;
    }

    if (updateData.nameID && updateData.nameID !== space.nameID) {
      let reservedNameIDs: string[] = [];
      if (space.level === SpaceLevel.SPACE) {
        reservedNameIDs =
          await this.namingService.getReservedNameIDsLevelZeroSpaces();
      } else {
        reservedNameIDs =
          await this.namingService.getReservedNameIDsInLevelZeroSpace(
            space.levelZeroSpaceID
          );
      }
      // updating the nameID, check new value is allowed
      const existingNameID = reservedNameIDs.includes(updateData.nameID);
      if (existingNameID) {
        throw new ValidationException(
          `Unable to update Space nameID: the provided nameID is already taken: ${updateData.nameID}`,
          LogContext.ACCOUNT
        );
      }
      space.nameID = updateData.nameID;
    }

    return await this.save(space);
  }

  private async updateSpaceVisibilityAllSubspaces(
    levelZeroSpaceID: string,
    visibility: SpaceVisibility
  ) {
    const spaces = await this.spaceRepository.find({
      where: {
        levelZeroSpaceID: levelZeroSpaceID,
      },
    });
    for (const space of spaces) {
      space.visibility = visibility;
      await this.save(space);
    }
  }

  public async updateSpaceSettings(
    space: ISpace,
    settingsData: UpdateSpaceSettingsInput
  ): Promise<ISpace> {
    return await this.updateSettings(space, settingsData.settings);
  }

  /**
   * Should the authorization policy be updated based on the update settings.
   * Some setting do not require an update to the authorization policy.
   * @param spaceId
   * @param settingsData
   */
  public async shouldUpdateAuthorizationPolicy(
    spaceId: string,
    settingsData: UpdateSpaceSettingsEntityInput
  ): Promise<boolean> {
    const space = await this.spaceRepository.findOneOrFail({
      where: { id: spaceId },
      select: {
        id: true,
        settings: {
          collaboration: {
            allowEventsFromSubspaces: true,
            allowMembersToCreateCallouts: true,
            allowMembersToCreateSubspaces: true,
            inheritMembershipRights: true,
          },
          membership: {
            allowSubspaceAdminsToInviteMembers: true,
            policy: true,
          },
          privacy: { allowPlatformSupportAsAdmin: true, mode: true },
        },
      },
    });

    const originalSettings = space.settings;
    // compare the new values from the incoming update request with the original settings
    const difference = getDiff(settingsData, originalSettings);
    // if there is no difference, then no need to update the authorization policy
    if (difference === null) {
      return false;
    }
    // if a difference was detected, check if the difference is in the allowed fields
    // if another field was updated, outside the allowed list, the auth policy has to be updated
    return !hasOnlyAllowedFields(difference, {
      collaboration: {
        allowEventsFromSubspaces: true,
      },
    });
  }

  async getSubspaces(
    space: ISpace,
    args?: LimitAndShuffleIdsQueryArgs
  ): Promise<ISpace[]> {
    let spaceWithSubspaces;
    if (args && args.IDs) {
      {
        spaceWithSubspaces = await this.getSpaceOrFail(space.id, {
          relations: {
            subspaces: {
              profile: true,
            },
          },
        });
        spaceWithSubspaces.subspaces = spaceWithSubspaces.subspaces?.filter(c =>
          args.IDs?.includes(c.id)
        );
      }
    } else
      spaceWithSubspaces = await this.getSpaceOrFail(space.id, {
        relations: {
          subspaces: {
            profile: true,
          },
        },
      });

    const subspaces = spaceWithSubspaces.subspaces;
    if (!subspaces) {
      throw new RelationshipNotFoundException(
        `Unable to load subspaces for Space ${space.id} `,
        LogContext.SPACES
      );
    }

    const limitAndShuffled = limitAndShuffle(
      subspaces,
      args?.limit,
      args?.shuffle
    );

    // Sort the subspaces base on their display name
    const sortedSubspaces = limitAndShuffled.sort((a, b) =>
      a.profile.displayName.toLowerCase() > b.profile.displayName.toLowerCase()
        ? 1
        : -1
    );
    return sortedSubspaces;
  }

  async getSubscriptions(spaceInput: ISpace): Promise<ISpaceSubscription[]> {
    const space = await this.getSpaceOrFail(spaceInput.id, {
      relations: {
        agent: {
          credentials: true,
        },
      },
    });
    if (!space.agent || !space.agent.credentials) {
      throw new EntityNotFoundException(
        `Unable to find agent with credentials for space: ${spaceInput.id}`,
        LogContext.ACCOUNT
      );
    }
    const subscriptions: ISpaceSubscription[] = [];
    for (const credential of space.agent.credentials) {
      if (
        Object.values(LicensingCredentialBasedCredentialType).includes(
          credential.type as LicensingCredentialBasedCredentialType
        )
      ) {
        subscriptions.push({
          name: credential.type as LicensingCredentialBasedCredentialType,
          expires: credential.expires,
        });
      }
    }
    return subscriptions;
  }

  async createSubspace(
    subspaceData: CreateSubspaceInput,
    agentInfo?: AgentInfo
  ): Promise<ISpace> {
    const space = await this.getSpaceOrFail(subspaceData.spaceID, {
      relations: {
        storageAggregator: true,
        templatesManager: true,
        community: {
          roleSet: true,
        },
      },
    });

    if (!space.storageAggregator || !space.community) {
      throw new EntityNotFoundException(
        `Unable to retrieve entities on space for creating subspace: ${space.id}`,
        LogContext.SPACES
      );
    }
    const reservedNameIDs =
      await this.namingService.getReservedNameIDsInLevelZeroSpace(
        space.levelZeroSpaceID
      );
    if (!subspaceData.nameID) {
      subspaceData.nameID =
        this.namingService.createNameIdAvoidingReservedNameIDs(
          subspaceData.profileData.displayName,
          reservedNameIDs
        );
    } else {
      if (reservedNameIDs.includes(subspaceData.nameID)) {
        throw new ValidationException(
          `Unable to create entity: the provided nameID is already taken: ${subspaceData.nameID}`,
          LogContext.SPACES
        );
      }
    }

    // Update the subspace data being passed in to set the storage aggregator to use
    subspaceData.storageAggregatorParent = space.storageAggregator;
    subspaceData.templatesManagerParent = space.templatesManager;
    subspaceData.level = space.level + 1;
    let subspace = await this.createSpace(subspaceData, agentInfo);

    subspace = await this.addSubspaceToSpace(space, subspace);
    subspace = await this.save(subspace);

    subspace = await this.getSpaceOrFail(subspace.id, {
      relations: {
        profile: true,
        community: {
          roleSet: true,
        },
      },
    });

    // Before assigning roles in the subspace check that the user is a member
    if (agentInfo) {
      if (!subspace.community || !subspace.community.roleSet) {
        throw new EntityNotInitializedException(
          `unable to load community with role set: ${subspace.id}`,
          LogContext.SPACES
        );
      }
      const roleSet = subspace.community.roleSet;
      const parentRoleSet = space.community.roleSet;
      const agent = await this.agentService.getAgentOrFail(agentInfo?.agentID);
      const isMember = await this.roleSetService.isMember(agent, parentRoleSet);
      if (isMember) {
        await this.assignUserToRoles(roleSet, agentInfo);
      }
    }

    return subspace;
  }

  public async addSubspaceToSpace(
    space: ISpace,
    subspace: ISpace
  ): Promise<ISpace> {
    if (
      !space.community ||
      !subspace.community ||
      !space.community.roleSet ||
      !subspace.community.roleSet
    ) {
      throw new ValidationException(
        `Unable to add Subspace to space, missing community or roleset relations: ${space.id}`,
        LogContext.SPACES
      );
    }

    // Set the parent space directly, avoiding saving the whole parent
    subspace.parentSpace = space;
    subspace.levelZeroSpaceID = space.levelZeroSpaceID;

    // Finally set the community relationship
    subspace.community = await this.setRoleSetHierarchyForSubspace(
      space.community,
      subspace.community
    );

    return subspace;
  }

  async getSubspace(subspaceID: string, space: ISpace): Promise<ISpace> {
    return await this.getSubspaceInLevelZeroScopeOrFail(
      subspaceID,
      space.levelZeroSpaceID
    );
  }

  public async assignContributorToRole(
    space: ISpace,
    contributor: IContributor,
    role: RoleType,
    type: RoleSetContributorType
  ) {
    if (!space.community || !space.community.roleSet) {
      throw new EntityNotInitializedException(
        `Community not initialised on Space for assigning contributor to role: ${space.id}`,
        LogContext.SPACES
      );
    }
    if (!contributor.agent) {
      throw new EntityNotInitializedException(
        `Agent not specified on contributor: ${contributor.id}`,
        LogContext.SPACES
      );
    }

    await this.roleSetService.assignContributorAgentToRole(
      space.community.roleSet,
      role,
      contributor.agent,
      type
    );
  }

  public async assignUserToRoles(roleSet: IRoleSet, agentInfo: AgentInfo) {
    await this.roleSetService.assignUserToRole(
      roleSet,
      RoleType.MEMBER,
      agentInfo.userID,
      agentInfo
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      RoleType.LEAD,
      agentInfo.userID,
      agentInfo
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      RoleType.ADMIN,
      agentInfo.userID,
      agentInfo
    );
  }

  public async update(spaceData: UpdateSpaceInput): Promise<ISpace> {
    const space = await this.getSpaceOrFail(spaceData.ID, {
      relations: {
        context: true,
        profile: true,
      },
    });

    if (spaceData.context) {
      if (!space.context)
        throw new EntityNotInitializedException(
          `Subspace not initialised: ${spaceData.ID}`,
          LogContext.SPACES
        );
      space.context = await this.contextService.updateContext(
        space.context,
        spaceData.context
      );
    }
    if (spaceData.profileData) {
      space.profile = await this.profileService.updateProfile(
        space.profile,
        spaceData.profileData
      );
    }

    return await this.save(space);
  }

  async getSubspaceInLevelZeroSpace(
    subspaceID: string,
    levelZeroSpaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | null> {
    let subspace: ISpace | null = null;
    if (subspaceID.length == UUID_LENGTH) {
      subspace = await this.spaceRepository.findOne({
        where: {
          id: subspaceID,
          levelZeroSpaceID: levelZeroSpaceID,
        },
        ...options,
      });
    }
    if (!subspace) {
      // look up based on nameID
      subspace = await this.spaceRepository.findOne({
        where: {
          nameID: subspaceID,
          levelZeroSpaceID: levelZeroSpaceID,
        },
        ...options,
      });
    }

    return subspace;
  }

  async getSubspaceInLevelZeroScopeOrFail(
    subspaceID: string,
    levelZeroSpaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | never> {
    const subspace = await this.getSubspaceInLevelZeroSpace(
      subspaceID,
      levelZeroSpaceID,
      options
    );

    if (!subspace) {
      throw new EntityNotFoundException(
        `Unable to find Space with ID: ${subspaceID}`,
        LogContext.SPACES
      );
    }

    return subspace;
  }

  private async setRoleSetHierarchyForSubspace(
    parentCommunity: ICommunity,
    childCommunity: ICommunity | undefined
  ): Promise<ICommunity> {
    if (
      !childCommunity ||
      !childCommunity.roleSet ||
      !parentCommunity ||
      !parentCommunity.roleSet
    ) {
      throw new EntityNotInitializedException(
        `Unable to set the parent relationship for rolesets: ${childCommunity?.id} and ${parentCommunity?.id}`,
        LogContext.COMMUNITY
      );
    }

    childCommunity.roleSet =
      await this.roleSetService.setParentRoleSetAndCredentials(
        childCommunity.roleSet,
        parentCommunity.roleSet
      );
    return childCommunity;
  }

  public async updateSettings(
    space: ISpace,
    settingsData: UpdateSpaceSettingsEntityInput
  ): Promise<ISpace> {
    const settings = space.settings;
    const updatedSettings = this.spaceSettingsService.updateSettings(
      settings,
      settingsData
    );
    space.settings = updatedSettings;
    return await this.save(space);
  }

  public async getAccountForLevelZeroSpaceOrFail(
    space: ISpace
  ): Promise<IAccount> {
    const spaceWithAccount = await this.spaceRepository.findOne({
      where: { id: space.levelZeroSpaceID },
      relations: {
        account: true,
      },
    });

    if (!spaceWithAccount || !spaceWithAccount.account) {
      throw new EntityNotFoundException(
        `Unable to find account for space with ID: ${space.id} + level zero space ID: ${space.levelZeroSpaceID}`,
        LogContext.SPACES
      );
    }

    return spaceWithAccount.account;
  }

  public async getCommunity(spaceId: string): Promise<ICommunity> {
    const subspaceWithCommunity = await this.getSpaceOrFail(spaceId, {
      relations: { community: true },
    });
    const community = subspaceWithCommunity.community;
    if (!community)
      throw new RelationshipNotFoundException(
        `Unable to load community for subspace ${spaceId} `,
        LogContext.COMMUNITY
      );
    return community;
  }

  public async getCommunityRoleSet(spaceId: string): Promise<IRoleSet> {
    const subspaceWithCommunityRoleSet = await this.getSpaceOrFail(spaceId, {
      relations: {
        community: {
          roleSet: true,
        },
      },
    });
    const community = subspaceWithCommunityRoleSet.community;
    if (!community || !community.roleSet) {
      throw new RelationshipNotFoundException(
        `Unable to load community with RoleSet for space ${spaceId} `,
        LogContext.COMMUNITY
      );
    }

    return community.roleSet;
  }

  async getTemplatesManagerOrFail(
    rootSpaceID: string
  ): Promise<ITemplatesManager> {
    const levelZeroSpace = await this.getSpaceOrFail(rootSpaceID, {
      relations: {
        templatesManager: true,
      },
    });

    if (!levelZeroSpace?.templatesManager) {
      throw new EntityNotFoundException(
        `Unable to find templatesManager for level zero space with id: ${rootSpaceID}`,
        LogContext.SPACES
      );
    }

    return levelZeroSpace.templatesManager;
  }

  public async activeSubscription(
    space: ISpace
  ): Promise<ISpaceSubscription | undefined> {
    const today = new Date();
    let plans: ILicensePlan[] = [];

    try {
      const licensingFramework =
        await this.licensingFrameworkService.getDefaultLicensingOrFail();

      plans = await this.licensingFrameworkService.getLicensePlansOrFail(
        licensingFramework.id
      );
    } catch (error) {
      this.logger.error(
        'Failed to retrieve licensing framework',
        error,
        LogContext.LICENSE
      );
      return undefined;
    }

    return (await this.getSubscriptions(space))
      .filter(
        subscription => !subscription.expires || subscription.expires > today
      )
      .map(subscription => {
        return {
          subscription,
          plan: plans.find(
            plan => plan.licenseCredential === subscription.name
          ),
        };
      })
      .filter(
        item => item.plan?.type === LicensingCredentialBasedPlanType.SPACE_PLAN
      )
      .sort((a, b) => b.plan!.sortOrder - a.plan!.sortOrder)?.[0]?.subscription;
  }

  public async getProvider(spaceInput: ISpace): Promise<IContributor> {
    const space = await this.spaceRepository.findOne({
      where: {
        id: spaceInput.levelZeroSpaceID,
      },
      relations: {
        account: true,
      },
    });
    if (!space || !space.account) {
      throw new RelationshipNotFoundException(
        `Unable to load Space with account to get Provider ${spaceInput.id} `,
        LogContext.LIBRARY
      );
    }
    const provider = await this.accountLookupService.getHost(space.account);
    if (!provider) {
      throw new RelationshipNotFoundException(
        `Unable to load provider for Space ${space.id} `,
        LogContext.LIBRARY
      );
    }
    return provider;
  }

  public async getContext(spaceID: string): Promise<IContext> {
    const subspaceWithContext = await this.getSpaceOrFail(spaceID, {
      relations: {
        context: true,
      },
    });
    const context = subspaceWithContext.context;
    if (!context)
      throw new RelationshipNotFoundException(
        `Unable to load context for space ${spaceID} `,
        LogContext.CONTEXT
      );
    return context;
  }

  public async getStorageAggregatorOrFail(
    spaceID: string
  ): Promise<IStorageAggregator> {
    const space = await this.getSpaceOrFail(spaceID, {
      relations: {
        storageAggregator: true,
      },
    });
    const storageAggregator = space.storageAggregator;
    if (!storageAggregator)
      throw new RelationshipNotFoundException(
        `Unable to load storage aggregator for space ${spaceID} `,
        LogContext.SPACES
      );
    return storageAggregator;
  }

  public async getProfile(subspaceId: string): Promise<IProfile> {
    const subspaceWithProfile = await this.getSpaceOrFail(subspaceId, {
      relations: { profile: true },
    });
    const profile = subspaceWithProfile.profile;
    if (!profile)
      throw new RelationshipNotFoundException(
        `Unable to load profile for subspace ${subspaceId} `,
        LogContext.PROFILE
      );
    return profile;
  }

  public async getCollaborationOrFail(
    subspaceId: string
  ): Promise<ICollaboration> | never {
    const subspaceWithCollaboration = await this.getSpaceOrFail(subspaceId, {
      relations: { collaboration: true },
    });
    const collaboration = subspaceWithCollaboration.collaboration;
    if (!collaboration)
      throw new RelationshipNotFoundException(
        `Unable to load collaboration for subspace ${subspaceId} `,
        LogContext.COLLABORATION
      );
    return collaboration;
  }

  public async getCalloutsSetOrFail(
    spaceId: string
  ): Promise<ICalloutsSet> | never {
    const subspaceWithCollaboration = await this.getSpaceOrFail(spaceId, {
      relations: {
        collaboration: {
          calloutsSet: true,
        },
      },
    });
    const calloutsSet = subspaceWithCollaboration.collaboration?.calloutsSet;
    if (!calloutsSet)
      throw new RelationshipNotFoundException(
        `Unable to load calloutsSet for sspace ${spaceId} `,
        LogContext.COLLABORATION
      );
    return calloutsSet;
  }

  public async getAgent(subspaceId: string): Promise<IAgent> {
    const subspaceWithContext = await this.getSpaceOrFail(subspaceId, {
      relations: { agent: true },
    });
    const agent = subspaceWithContext.agent;
    if (!agent)
      throw new RelationshipNotFoundException(
        `Unable to load Agent for subspace ${subspaceId}`,
        LogContext.AGENT
      );
    return agent;
  }

  public async getPostsCount(space: ISpace): Promise<number> {
    const calloutsSet = await this.getCalloutsSetOrFail(space.id);

    return await this.collaborationService.getPostsCount(calloutsSet);
  }

  public async getWhiteboardsCount(space: ISpace): Promise<number> {
    const calloutsSet = await this.getCalloutsSetOrFail(space.id);
    return await this.collaborationService.getWhiteboardsCount(calloutsSet);
  }

  async getSubspacesInSpaceCount(parentSpaceId: string): Promise<number> {
    const subspaces = await this.spaceRepository.findBy({
      parentSpace: {
        id: parentSpaceId,
      },
      level: Not(0), // At least one parent in the tree
    });

    let children = 0;
    for await (const subspace of subspaces.map(
      async subspace => await this.getSubspacesInSpaceCount(subspace.id)
    )) {
      children += subspace;
    }

    return subspaces.length + children;
  }

  async getMetrics(space: ISpace): Promise<INVP[]> {
    const metrics: INVP[] = [];

    // Subspaces
    const subspacesCount = await this.getSubspacesInSpaceCount(space.id);
    const subspacesTopic = new NVP('subspaces', subspacesCount.toString());
    subspacesTopic.id = `subspaces-${space.id}`;
    metrics.push(subspacesTopic);

    const roleSet = await this.getCommunityRoleSet(space.id);

    // Members
    const membersCount = await this.roleSetService.getMembersCount(roleSet);
    const membersTopic = new NVP('members', membersCount.toString());
    membersTopic.id = `members-${space.id}`;
    metrics.push(membersTopic);

    // Posts
    const postsCount = await this.getPostsCount(space);
    const postsTopic = new NVP('posts', postsCount.toString());
    postsTopic.id = `posts-${space.id}`;
    metrics.push(postsTopic);

    // Whiteboards
    const whiteboardsCount = await this.getWhiteboardsCount(space);
    const whiteboardsTopic = new NVP(
      'whiteboards',
      whiteboardsCount.toString()
    );
    whiteboardsTopic.id = `whiteboards-${space.id}`;
    metrics.push(whiteboardsTopic);

    return metrics;
  }
}
