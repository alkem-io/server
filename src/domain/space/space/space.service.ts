import { UUID_LENGTH } from '@common/constants';
import { LogContext } from '@common/enums';
import { AgentType } from '@common/enums/agent.type';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LicenseEntitlementDataType } from '@common/enums/license.entitlement.data.type';
import { LicenseEntitlementType } from '@common/enums/license.entitlement.type';
import { LicenseType } from '@common/enums/license.type';
import { LicensingCredentialBasedCredentialType } from '@common/enums/licensing.credential.based.credential.type';
import { LicensingCredentialBasedPlanType } from '@common/enums/licensing.credential.based.plan.type';
import { RoleName } from '@common/enums/role.name';
import { RoleSetType } from '@common/enums/role.set.type';
import { SpaceLevel } from '@common/enums/space.level';
import { SpacePrivacyMode } from '@common/enums/space.privacy.mode';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { TemplateDefaultType } from '@common/enums/template.default.type';
import { TemplateType } from '@common/enums/template.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
  NotSupportedException,
  RelationshipNotFoundException,
  ValidationException,
} from '@common/exceptions';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';
import { getDiff, hasOnlyAllowedFields } from '@common/utils';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { PaginationArgs } from '@core/pagination';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { IPlatformRolesAccess } from '@domain/access/platform-roles-access/platform.roles.access.interface';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IAgent } from '@domain/agent/agent';
import { AgentService } from '@domain/agent/agent/agent.service';
import { ICalloutsSet } from '@domain/collaboration/callouts-set/callouts.set.interface';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { ILicense } from '@domain/common/license/license.interface';
import { LicenseService } from '@domain/common/license/license.service';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { ICommunity } from '@domain/community/community';
import { CommunityService } from '@domain/community/community/community.service';
import { CreateCommunityInput } from '@domain/community/community/dto/community.dto.create';
import { InnovationHub, InnovationHubType } from '@domain/innovation-hub/types';
import { CreateSpaceInput, DeleteSpaceInput } from '@domain/space/space';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { ITemplateContentSpace } from '@domain/template/template-content-space/template.content.space.interface';
import { TemplateContentSpaceService } from '@domain/template/template-content-space/template.content.space.service';
import { CreateTemplateDefaultInput } from '@domain/template/template-default/dto/template.default.dto.create';
import { ITemplatesManager } from '@domain/template/templates-manager';
import { CreateTemplatesManagerInput } from '@domain/template/templates-manager/dto/templates.manager.dto.create';
import { TemplatesManagerService } from '@domain/template/templates-manager/templates.manager.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Activity } from '@platform/activity';
import { ILicensePlan } from '@platform/licensing/credential-based/license-plan/license.plan.interface';
import { LicensingFrameworkService } from '@platform/licensing/credential-based/licensing-framework/licensing.framework.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { UrlGeneratorCacheService } from '@services/infrastructure/url-generator/url.generator.service.cache';
import { keyBy } from 'lodash';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindManyOptions, FindOneOptions, In, Repository } from 'typeorm';
import { IAccount } from '../account/account.interface';
import { ISpaceAbout } from '../space.about/space.about.interface';
import { SpaceAboutService } from '../space.about/space.about.service';
import { SpaceDefaultsService } from '../space.defaults/space.defaults.service';
import { SpaceLookupService } from '../space.lookup/space.lookup.service';
import { UpdateSpaceSettingsEntityInput } from '../space.settings/dto/space.settings.dto.update';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { SpacesQueryArgs } from './dto/space.args.query.spaces';
import { CreateSubspaceInput } from './dto/space.dto.create.subspace';
import { UpdateSpaceInput } from './dto/space.dto.update';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { UpdateSubspacesSortOrderInput } from './dto/space.dto.update.subspaces.sort.order';
import { Space } from './space.entity';
import { ISpace } from './space.interface';
import { ISpaceSubscription } from './space.license.subscription.interface';
import { SpacePlatformRolesAccessService } from './space.service.platform.roles.access';

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
    private authorizationPolicyService: AuthorizationPolicyService,
    private spacesFilterService: SpaceFilterService,
    private spaceAboutService: SpaceAboutService,
    private agentService: AgentService,
    private communityService: CommunityService,
    private roleSetService: RoleSetService,
    private namingService: NamingService,
    private spaceSettingsService: SpaceSettingsService,
    private spaceDefaultsService: SpaceDefaultsService,
    private spaceLookupService: SpaceLookupService,
    private storageAggregatorService: StorageAggregatorService,
    private collaborationService: CollaborationService,
    private licensingFrameworkService: LicensingFrameworkService,
    private templatesManagerService: TemplatesManagerService,
    private templateContentSpaceService: TemplateContentSpaceService,
    private licenseService: LicenseService,
    private urlGeneratorCacheService: UrlGeneratorCacheService,
    private spacePlatformRolesAccessService: SpacePlatformRolesAccessService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  /**
   * Create a new Space.
   * @param spaceData
   * @param templateContentSpaceID The template to use for any content missing.
   * @param agentInfo
   * @returns
   */
  private async createSpace(
    spaceData: CreateSpaceInput,
    templateContentSpace: ITemplateContentSpace,
    agentInfo: AgentInfo,
    parentPlatformRolesAccess?: IPlatformRolesAccess
  ): Promise<ISpace> {
    const space: ISpace = Space.create(spaceData);
    // default to demo space
    space.visibility = SpaceVisibility.ACTIVE;
    space.sortOrder = 0;

    space.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.SPACE
    );

    space.settings = templateContentSpace.settings;
    space.platformRolesAccess =
      this.spacePlatformRolesAccessService.createPlatformRolesAccess(
        space,
        space.settings,
        parentPlatformRolesAccess
      );

    const storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.SPACE,
        spaceData.storageAggregatorParent
      );
    space.storageAggregator = storageAggregator;

    space.license = this.createLicenseForSpaceL0();

    const roleSetRolesData = this.spaceDefaultsService.getRoleSetCommunityRoles(
      space.level
    );
    const applicationFormData =
      this.spaceDefaultsService.getRoleSetCommunityApplicationForm(space.level);

    const communityData: CreateCommunityInput = {
      name: spaceData.about.profileData.displayName,
      roleSetData: {
        roles: roleSetRolesData,
        applicationForm: applicationFormData,
        entryRoleName: RoleName.MEMBER,
        type: RoleSetType.SPACE,
      },
    };

    space.community =
      await this.communityService.createCommunity(communityData);

    // Apply the About from the Template but preserve the user provided data
    const modifiedAbout = this.spaceAboutService.getMergedTemplateSpaceAbout(
      templateContentSpace.about,
      spaceData.about
    );

    space.about = await this.spaceAboutService.createSpaceAbout(
      modifiedAbout,
      storageAggregator
    );

    space.levelZeroSpaceID = spaceData.levelZeroSpaceID;
    // save the collaboration and all it's template sets
    await this.save(space);

    if (spaceData.level === SpaceLevel.L0) {
      space.levelZeroSpaceID = space.id;

      space.templatesManager = await this.createTemplatesManagerForSpaceL0();
    }

    //// Collaboration
    let updatedCollaborationData: CreateCollaborationInput =
      spaceData.collaborationData;
    updatedCollaborationData.isTemplate = false;
    // Pick up the default template that is applicable
    updatedCollaborationData =
      await this.spaceDefaultsService.createCollaborationInput(
        updatedCollaborationData,
        templateContentSpace
      );
    if (spaceData.collaborationData.addTutorialCallouts) {
      updatedCollaborationData =
        await this.spaceDefaultsService.addTutorialCalloutsFromTemplate(
          updatedCollaborationData
        );
    }
    space.collaboration = await this.collaborationService.createCollaboration(
      updatedCollaborationData,
      space.storageAggregator,
      agentInfo
    );

    space.agent = await this.agentService.createAgent({
      type: AgentType.SPACE,
    });

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

    const spaceUpdated = await this.save(space);
    // If template has child spaces, then create child spaces here
    if (
      templateContentSpace.subspaces &&
      templateContentSpace.subspaces.length > 0 &&
      space.level !== SpaceLevel.L2 // Do not go beyond L2 for now
    ) {
      for (const subspaceContent of templateContentSpace.subspaces) {
        const subspaceData: CreateSubspaceInput = {
          spaceID: spaceUpdated.id,
          levelZeroSpaceID: spaceUpdated.levelZeroSpaceID,
          storageAggregatorParent: spaceUpdated.storageAggregator,
          level: space.level + 1,
          about: {
            profileData: {
              displayName: subspaceContent.about.profile.displayName,
            },
          },
          collaborationData: {
            addCallouts: spaceData.collaborationData.addCallouts,
            calloutsSetData: {},
          },
        };
        await this.createSubspace(subspaceData, agentInfo, subspaceContent.id);
      }
    }

    return spaceUpdated;
  }

  public createLicenseForSpaceL0(): ILicense {
    return this.licenseService.createLicense({
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
        {
          type: LicenseEntitlementType.SPACE_FLAG_MEMO_MULTI_USER,
          dataType: LicenseEntitlementDataType.FLAG,
          limit: 0,
          enabled: true,
        },
      ],
    });
  }

  async save(space: ISpace): Promise<ISpace> {
    return await this.spaceRepository.save(space);
  }

  async deleteSpaceOrFail(deleteData: DeleteSpaceInput): Promise<ISpace> {
    const space = await this.getSpaceOrFail(deleteData.ID, {
      relations: {
        subspaces: true,
        collaboration: true,
        community: true,
        about: true,
        agent: true,
        storageAggregator: true,
        templatesManager: true,
        license: true,
      },
    });

    if (
      !space.subspaces ||
      !space.collaboration ||
      !space.community ||
      !space.about ||
      !space.agent ||
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

    await this.spaceAboutService.removeSpaceAbout(space.about.id);
    await this.collaborationService.deleteCollaborationOrFail(
      space.collaboration.id
    );
    await this.communityService.removeCommunityOrFail(space.community.id);
    await this.agentService.deleteAgent(space.agent.id);
    await this.licenseService.removeLicenseOrFail(space.license.id);
    await this.authorizationPolicyService.delete(space.authorization);

    if (space.level === SpaceLevel.L0) {
      if (!space.templatesManager) {
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

  public async createTemplatesManagerForSpaceL0(): Promise<ITemplatesManager> {
    const templateDefaultData: CreateTemplateDefaultInput = {
      type: TemplateDefaultType.SPACE_SUBSPACE,
      allowedTemplateType: TemplateType.SPACE,
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

  /**
   * Retrieves spaces for a given innovation hub.
   * @throws {EntityNotInitializedException} if a filter is not defined.
   * @throws {NotSupportedException} if the innovation hub type is not supported.
   */
  public async getSpacesForInnovationHub({
    id,
    type,
    spaceListFilter,
    spaceVisibilityFilter,
  }: InnovationHub): Promise<Space[]> {
    if (type === InnovationHubType.VISIBILITY) {
      if (!spaceVisibilityFilter) {
        throw new EntityNotInitializedException(
          `'spaceVisibilityFilter' of Innovation Hub '${id}' not defined`,
          LogContext.INNOVATION_HUB
        );
      }

      return this.spaceRepository.findBy({
        visibility: spaceVisibilityFilter,
        level: SpaceLevel.L0,
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
          level: SpaceLevel.L0,
          visibility: In(visibilities),
        },
        ...options,
      });
    } else {
      spaces = await this.spaceRepository.find({
        where: {
          visibility: In(visibilities),
          level: SpaceLevel.L0,
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
        about: {
          profile: true,
        },
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
        level: SpaceLevel.L0,
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
      level: SpaceLevel.L0,
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

  async getSpaceOrFail(
    spaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace> {
    const space = await this.getSpace(spaceID, options);
    if (!space)
      throw new EntityNotFoundException(
        `Unable to find Space using options '${JSON.stringify(options)}'`,
        LogContext.SPACES,
        { spaceID }
      );
    return space;
  }

  public async getExploreSpaces(
    limit = EXPLORE_SPACES_LIMIT,
    daysOld = EXPLORE_SPACES_ACTIVITY_DAYS_OLD
  ): Promise<ISpace[]> {
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - daysOld);

    // First, get the space IDs ordered by activity count using a subquery approach
    // This avoids PostgreSQL GROUP BY issues with joined columns
    const spaceIdsWithActivity = await this.spaceRepository
      .createQueryBuilder('s')
      .select('s.id', 'id')
      .innerJoin(Activity, 'a', 's.collaborationId = a.collaborationID')
      .where({
        level: SpaceLevel.L0,
        visibility: SpaceVisibility.ACTIVE,
      })
      // activities in the past "daysOld" days
      .andWhere('a.createdDate >= :daysAgo', { daysAgo })
      .groupBy('s.id')
      .orderBy('COUNT(a.id)', 'DESC')
      .limit(limit)
      .getRawMany<{ id: string }>();

    if (spaceIdsWithActivity.length === 0) {
      return [];
    }

    const spaceIds = spaceIdsWithActivity.map(row => row.id);

    // Then fetch the full space entities with authorization relation
    const spaces = await this.spaceRepository.find({
      where: { id: In(spaceIds) },
      relations: { authorization: true },
    });

    // Preserve the activity-based ordering from the first query
    const spaceMap = new Map(spaces.map(space => [space.id, space]));
    return spaceIds
      .map(id => spaceMap.get(id))
      .filter((space): space is Space => space !== undefined);
  }

  async getSpace(
    spaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | null> {
    const space = await this.spaceRepository.findOne({
      where: {
        id: spaceID,
      },
      ...options,
    });

    return space;
  }

  public async getAllSpaces(
    options?: FindManyOptions<ISpace>
  ): Promise<ISpace[]> {
    return this.spaceRepository.find(options);
  }

  public async updatePlatformRolesAccessRecursively(
    space: ISpace,
    parentPlatformRolesAccess?: IPlatformRolesAccess
  ): Promise<ISpace> {
    const { subspaces } = await this.getSpaceOrFail(space.id, {
      relations: {
        subspaces: true,
      },
    });

    space.platformRolesAccess =
      this.spacePlatformRolesAccessService.createPlatformRolesAccess(
        space,
        space.settings,
        parentPlatformRolesAccess
      );
    const result = await this.save(space);

    // If the space has subspaces, update their platform roles access recursively
    if (subspaces && subspaces.length > 0) {
      await Promise.all(
        subspaces.map(subspace =>
          this.updatePlatformRolesAccessRecursively(
            subspace,
            space.platformRolesAccess
          )
        )
      );
    }
    return result;
  }

  public async updateSpacePlatformSettings(
    space: ISpace,
    updateData: UpdateSpacePlatformSettingsInput
  ): Promise<ISpace> {
    if (updateData.visibility && updateData.visibility !== space.visibility) {
      // Only update visibility on L0 spaces
      if (space.level !== SpaceLevel.L0) {
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
      if (space.level === SpaceLevel.L0) {
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

      // Store the old nameID for logging purposes
      const oldNameID = space.nameID;
      space.nameID = updateData.nameID;

      // Invalidate URL cache for this space's profile
      await this.urlGeneratorCacheService.revokeUrlCache(
        space.about.profile.id
      );

      // Invalidate URL cache for all subspaces since their URLs include parent nameIDs
      if (space.level === SpaceLevel.L0) {
        // For L0 spaces, invalidate all subspaces in the entire space hierarchy
        const allSubspaces = await this.spaceRepository.find({
          where: {
            levelZeroSpaceID: space.id,
          },
          relations: {
            about: {
              profile: true,
            },
          },
        });

        for (const subspace of allSubspaces) {
          if (subspace.about?.profile?.id) {
            await this.urlGeneratorCacheService.revokeUrlCache(
              subspace.about.profile.id
            );
          }
        }

        this.logger.verbose?.(
          `Invalidated URL cache for space ${space.id} (nameID: ${oldNameID} -> ${updateData.nameID}) and ${allSubspaces.length} subspaces`,
          LogContext.SPACES
        );
      } else {
        // For subspaces, also invalidate any child subspaces
        const childSubspaces = await this.spaceRepository.find({
          where: {
            parentSpace: { id: space.id },
          },
          relations: {
            about: {
              profile: true,
            },
          },
        });

        for (const childSubspace of childSubspaces) {
          if (childSubspace.about?.profile?.id) {
            await this.urlGeneratorCacheService.revokeUrlCache(
              childSubspace.about.profile.id
            );
          }
        }

        this.logger.verbose?.(
          `Invalidated URL cache for subspace ${space.id} (nameID: ${oldNameID} -> ${updateData.nameID}) and ${childSubspaces.length} child subspaces`,
          LogContext.SPACES
        );
      }
    }

    await this.save(space);

    // Update the platform roles access for the space
    const parentPlatformRolesAccess =
      await this.getParentSpacePlatformRolesAccess(space);
    return await this.updatePlatformRolesAccessRecursively(
      space,
      parentPlatformRolesAccess
    );
  }

  private async getParentSpacePlatformRolesAccess(
    space: ISpace
  ): Promise<IPlatformRolesAccess | undefined> {
    if (space.level === SpaceLevel.L0) {
      return undefined;
    }

    const { parentSpace } = await this.getSpaceOrFail(space.id, {
      relations: {
        parentSpace: true,
      },
    });

    if (!parentSpace || !parentSpace.platformRolesAccess) {
      throw new EntityNotFoundException(
        'Unable to find parent space platform roles access for subspace',
        LogContext.SPACES,
        { spaceId: space.id }
      );
    }

    return parentSpace.platformRolesAccess;
  }

  private async updateSpaceVisibilityAllSubspaces(
    levelZeroSpaceID: string,
    visibility: SpaceVisibility
  ) {
    await this.spaceRepository.update(
      {
        levelZeroSpaceID: levelZeroSpaceID,
      },
      { visibility }
    );
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
      spaceWithSubspaces = await this.getSpaceOrFail(space.id, {
        relations: {
          subspaces: {
            about: {
              profile: true,
            },
          },
        },
      });
      spaceWithSubspaces.subspaces = spaceWithSubspaces.subspaces?.filter(c =>
        args.IDs?.includes(c.id)
      );
    } else
      spaceWithSubspaces = await this.getSpaceOrFail(space.id, {
        relations: {
          subspaces: {
            about: {
              profile: true,
            },
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

    // Sort the subspaces based on sortOrder, with displayName as tiebreaker
    // Skip sorting when shuffle is requested to preserve randomization
    if (args?.shuffle) {
      return limitAndShuffled;
    }

    return limitAndShuffled.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.about.profile.displayName
        .toLowerCase()
        .localeCompare(b.about.profile.displayName.toLowerCase());
    });
  }

  public async updateSubspacesSortOrder(
    space: ISpace,
    sortOrderData: UpdateSubspacesSortOrderInput
  ): Promise<ISpace[]> {
    // Validate for duplicate IDs
    const uniqueIds = new Set(sortOrderData.subspaceIDs);
    if (uniqueIds.size !== sortOrderData.subspaceIDs.length) {
      throw new ValidationException(
        'Duplicate subspace IDs provided',
        LogContext.SPACES
      );
    }

    const spaceLoaded = await this.getSpaceOrFail(space.id, {
      relations: { subspaces: true },
    });

    const allSubspaces = spaceLoaded.subspaces;
    if (!allSubspaces) {
      throw new EntityNotFoundException(
        'Space not initialized, no subspaces',
        LogContext.SPACES,
        { spaceId: space.id }
      );
    }

    const subspacesByID = keyBy(allSubspaces, 'id');

    // Validate all IDs exist before processing (fail fast)
    const missingIds = sortOrderData.subspaceIDs.filter(
      id => !subspacesByID[id]
    );
    if (missingIds.length > 0) {
      throw new EntityNotFoundException(
        'Subspace not found within parent Space',
        LogContext.SPACES,
        { missingSubspaceIds: missingIds, parentSpaceId: space.id }
      );
    }

    const sortOrders = sortOrderData.subspaceIDs
      .map(subspaceId => subspacesByID[subspaceId]?.sortOrder)
      .filter(sortOrder => sortOrder !== undefined);

    const minimumSortOrder =
      sortOrders.length > 0 ? Math.min(...sortOrders) : 0;
    const modifiedSubspaces: ISpace[] = [];

    // Use step of 10 to avoid collisions with untouched siblings during partial reorder
    const SORT_ORDER_STEP = 10;
    const subspacesInOrder: ISpace[] = [];
    let index = 1;
    for (const subspaceID of sortOrderData.subspaceIDs) {
      const subspace = subspacesByID[subspaceID];
      subspacesInOrder.push(subspace);
      const newSortOrder = minimumSortOrder + index * SORT_ORDER_STEP;
      if (subspace.sortOrder !== newSortOrder) {
        subspace.sortOrder = newSortOrder;
        modifiedSubspaces.push(subspace);
      }
      index++;
    }

    await this.spaceRepository.save(modifiedSubspaces);

    return subspacesInOrder;
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

  public async createRootSpaceAndSubspaces(
    spaceData: CreateSpaceInput,
    agentInfo: AgentInfo
  ): Promise<ISpace> {
    const templateContentSpaceID =
      await this.spaceDefaultsService.getTemplateSpaceContentToAugmentFrom(
        spaceData.level,
        spaceData.spaceTemplateID
      );

    const templateContentSpace = await this.getTemplateContentSpaceWithData(
      templateContentSpaceID
    );

    // Force the innovation flow settings for L0
    if (!templateContentSpace.collaboration?.innovationFlow) {
      throw new EntityNotInitializedException(
        `Template content space does not have innovation flow settings: ${templateContentSpaceID}`,
        LogContext.SPACES
      );
    }
    if (templateContentSpace.collaboration.innovationFlow.states.length < 4) {
      throw new ValidationException(
        `Template content space innovation flow states must have at least 4 states: ${templateContentSpaceID}`,
        LogContext.SPACES
      );
    }
    templateContentSpace.collaboration.innovationFlow.settings.minimumNumberOfStates = 4;
    templateContentSpace.collaboration.innovationFlow.settings.maximumNumberOfStates = 4;

    return await this.createSpace(spaceData, templateContentSpace, agentInfo);
  }

  public async createSubspace(
    subspaceData: CreateSubspaceInput,
    agentInfo: AgentInfo,
    templateContentSpaceID?: string
  ): Promise<ISpace> {
    const space = await this.getSpaceOrFail(subspaceData.spaceID, {
      relations: {
        storageAggregator: true,
        templatesManager: true,
        community: {
          roleSet: true,
        },
        parentSpace: true,
        subspaces: true,
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
          subspaceData.about.profileData.displayName,
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
    subspaceData.levelZeroSpaceID = space.levelZeroSpaceID;

    // Need to know the Space L0 library to use
    const levelZeroSpaceID = space.levelZeroSpaceID;
    let levelZeroSpace = space;
    if (levelZeroSpaceID !== space.id) {
      levelZeroSpace = await this.getSpaceOrFail(levelZeroSpaceID, {
        relations: {
          templatesManager: true,
        },
      });
    }

    subspaceData.level = space.level + 1;
    let templateContentSubspaceID = templateContentSpaceID;
    if (!templateContentSubspaceID) {
      templateContentSubspaceID =
        await this.spaceDefaultsService.getTemplateSpaceContentToAugmentFrom(
          subspaceData.level,
          subspaceData.spaceTemplateID,
          levelZeroSpace.templatesManager
        );
    }

    const templateContentSubspace = await this.getTemplateContentSpaceWithData(
      templateContentSubspaceID
    );

    // Overwrite Innovation Flow Restrictions:
    if (!templateContentSubspace.collaboration?.innovationFlow) {
      throw new EntityNotInitializedException(
        `Template Content Space does not have Innovation Flow: ${templateContentSpaceID}`,
        LogContext.TEMPLATES
      );
    }
    templateContentSubspace.collaboration.innovationFlow.settings.maximumNumberOfStates = 8;
    templateContentSubspace.collaboration.innovationFlow.settings.minimumNumberOfStates = 1;

    let subspace = await this.createSpace(
      subspaceData,
      templateContentSubspace,
      agentInfo,
      space.platformRolesAccess
    );

    // Calculate sortOrder for new subspace (appears first = lowest sortOrder)
    if (space.subspaces && space.subspaces.length > 0) {
      subspace.sortOrder =
        Math.min(...space.subspaces.map(s => s.sortOrder), 0) - 1;
    } else {
      subspace.sortOrder = 0;
    }

    subspace = await this.addSubspaceToSpace(space, subspace);
    subspace = await this.save(subspace);

    subspace = await this.getSpaceOrFail(subspace.id, {
      relations: {
        about: {
          profile: true,
        },
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

  private async getTemplateContentSpaceWithData(
    templateContentSpaceID: string
  ): Promise<ITemplateContentSpace> {
    // Reload to get the data
    const templateContentSpace =
      await this.templateContentSpaceService.getTemplateContentSpaceOrFail(
        templateContentSpaceID,
        {
          relations: {
            subspaces: {
              about: {
                profile: true,
              },
            },
            collaboration: {
              innovationFlow: {
                states: true,
              },
            },
            about: {
              profile: {
                references: true,
                visuals: true,
                location: true,
                tagsets: true,
              },
              guidelines: {
                profile: {
                  references: true,
                },
              },
            },
          },
        }
      );

    if (
      !templateContentSpace.collaboration ||
      !templateContentSpace.about ||
      !templateContentSpace.subspaces
    ) {
      throw new ValidationException(
        `Unable to get template content space with data: ${templateContentSpaceID}`,
        LogContext.TEMPLATES
      );
    }
    return templateContentSpace;
  }

  async getSubspace(subspaceID: string, space: ISpace): Promise<ISpace> {
    return await this.getSubspaceInLevelZeroScopeOrFail(
      subspaceID,
      space.levelZeroSpaceID
    );
  }

  public async assignUserToRoles(roleSet: IRoleSet, agentInfo: AgentInfo) {
    if (!agentInfo.userID || agentInfo.userID.length !== UUID_LENGTH) {
      // No userID to assign the role to
      return;
    }
    await this.roleSetService.assignUserToRole(
      roleSet,
      RoleName.MEMBER,
      agentInfo.userID,
      agentInfo
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      RoleName.LEAD,
      agentInfo.userID,
      agentInfo
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      RoleName.ADMIN,
      agentInfo.userID,
      agentInfo
    );
  }

  public async assignOrganizationToMemberLeadRoles(
    roleSet: IRoleSet,
    organizationID: string
  ) {
    await this.roleSetService.assignOrganizationToRole(
      roleSet,
      RoleName.MEMBER,
      organizationID
    );

    await this.roleSetService.assignOrganizationToRole(
      roleSet,
      RoleName.LEAD,
      organizationID
    );
  }

  public async update(spaceData: UpdateSpaceInput): Promise<ISpace> {
    const space = await this.getSpaceOrFail(spaceData.ID, {
      relations: {
        about: {
          profile: true,
        },
      },
    });

    if (!space.about) {
      throw new EntityNotInitializedException(
        `Subspace not initialised: ${spaceData.ID}`,
        LogContext.SPACES
      );
    }

    if (spaceData.about) {
      space.about = await this.spaceAboutService.updateSpaceAbout(
        space.about,
        spaceData.about
      );
    }

    return await this.save(space);
  }

  async getSubspaceInLevelZeroScopeOrFail(
    subspaceID: string,
    levelZeroSpaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace> {
    const subspace =
      await this.spaceLookupService.getSubspaceByNameIdInLevelZeroSpace(
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
    spaceID: string,
    settingsData: UpdateSpaceSettingsEntityInput
  ): Promise<ISpace> {
    let space = await this.getSpaceOrFail(spaceID, {
      relations: {
        parentSpace: true,
      },
    });
    const settings = space.settings;
    const updatedSettings = this.spaceSettingsService.updateSettings(
      settings,
      settingsData
    );
    space.settings = updatedSettings;
    space = await this.save(space);

    return await this.updatePlatformRolesAccessRecursively(
      space,
      space.parentSpace?.platformRolesAccess
    );
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

  public async getSpaceAbout(spaceID: string): Promise<ISpaceAbout> {
    const space = await this.getSpaceOrFail(spaceID, {
      relations: { about: true },
    });
    const about = space.about;
    if (!about)
      throw new RelationshipNotFoundException(
        `Unable to load about for Space ${spaceID} `,
        LogContext.SPACES
      );
    return about;
  }

  /**
   * Retrieves a callouts set for a given space ID or throws if not found.
   * @throws {RelationshipNotFoundException} if callouts set or collaboration is not found.
   * @throws {EntityNotFoundException} if space is not found.
   */
  public async getCalloutsSetOrFail(spaceId: string): Promise<ICalloutsSet> {
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
}
