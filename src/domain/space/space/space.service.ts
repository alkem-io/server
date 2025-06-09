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
import { ICommunity } from '@domain/community/community';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, FindOneOptions, In, Repository } from 'typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Space } from './space.entity';
import { ISpace } from './space.interface';
import { UpdateSpaceInput } from './dto/space.dto.update';
import { CreateSubspaceInput } from './dto/space.dto.create.subspace';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { limitAndShuffle } from '@common/utils/limitAndShuffle';
import { SpacesQueryArgs } from './dto/space.args.query.spaces';
import { SpaceVisibility } from '@common/enums/space.visibility';
import { SpaceFilterService } from '@services/infrastructure/space-filter/space.filter.service';
import { LimitAndShuffleIdsQueryArgs } from '@domain/common/query-args/limit-and-shuffle.ids.query.args';
import { InnovationHub, InnovationHubType } from '@domain/innovation-hub/types';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';
import { PaginationArgs } from '@core/pagination';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { UpdateSpacePlatformSettingsInput } from './dto/space.dto.update.platform.settings';
import { AgentService } from '@domain/agent/agent/agent.service';
import { CollaborationService } from '@domain/collaboration/collaboration/collaboration.service';
import { AuthorizationPolicy } from '@domain/common/authorization-policy';
import { CommunityService } from '@domain/community/community/community.service';
import { CreateCommunityInput } from '@domain/community/community/dto/community.dto.create';
import { StorageAggregatorService } from '@domain/storage/storage-aggregator/storage.aggregator.service';
import { NamingService } from '@services/infrastructure/naming/naming.service';
import { SpaceDefaultsService } from '../space.defaults/space.defaults.service';
import { SpaceSettingsService } from '../space.settings/space.settings.service';
import { UpdateSpaceSettingsEntityInput } from '../space.settings/dto/space.settings.dto.update';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { RoleName } from '@common/enums/role.name';
import { SpaceLevel } from '@common/enums/space.level';
import { UpdateSpaceSettingsInput } from './dto/space.dto.update.settings';
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
import { RoleSetType } from '@common/enums/role.set.type';
import { ISpaceAbout } from '../space.about/space.about.interface';
import { SpaceAboutService } from '../space.about/space.about.service';
import { ILicense } from '@domain/common/license/license.interface';

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
    const space: ISpace = Space.create(spaceData);
    // default to demo space
    space.visibility = SpaceVisibility.ACTIVE;

    space.authorization = new AuthorizationPolicy(
      AuthorizationPolicyType.SPACE
    );
    space.settings = this.spaceDefaultsService.getDefaultSpaceSettings(
      space.level
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

    space.about = await this.spaceAboutService.createSpaceAbout(
      spaceData.about,
      storageAggregator
    );

    space.levelZeroSpaceID = '';
    // save the collaboration and all it's template sets
    await this.save(space);

    if (spaceData.level === SpaceLevel.L0) {
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
        space.level,
        spaceData.platformTemplate,
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

    if (space.level === SpaceLevel.L0) {
      space.templatesManager = await this.createTemplatesManagerForSpaceL0();
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
      ],
    });
  }

  public async createTemplatesManagerForSpaceL0(): Promise<ITemplatesManager> {
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
          level: SpaceLevel.L0,
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
    const space = await this.spaceRepository.findOne({
      where: {
        id: spaceID,
      },
      ...options,
    });

    return space;
  }

  public async getSpaceByNameIdOrFail(
    spaceNameID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace> {
    const space = await this.spaceRepository.findOne({
      where: {
        nameID: spaceNameID,
        level: SpaceLevel.L0,
      },
      ...options,
    });
    if (!space) {
      if (!space)
        throw new EntityNotFoundException(
          `Unable to find L0 Space with nameID: ${spaceNameID}`,
          LogContext.SPACES
        );
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
              about: {
                profile: true,
              },
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

    // Sort the subspaces base on their display name
    const sortedSubspaces = limitAndShuffled.sort((a, b) =>
      a.about.profile.displayName.toLowerCase() >
      b.about.profile.displayName.toLowerCase()
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
        parentSpace: true,
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

    let rootTemplatesManager = space.templatesManager;
    let parentSpace = space.parentSpace;
    while (!rootTemplatesManager && parentSpace) {
      parentSpace = await this.getSpaceOrFail(parentSpace.id, {
        relations: {
          templatesManager: true,
          parentSpace: true,
        },
      });
      rootTemplatesManager = parentSpace.templatesManager;
    }

    subspaceData.templatesManagerParent = rootTemplatesManager;
    subspaceData.level = space.level + 1;
    let subspace = await this.createSpace(subspaceData, agentInfo);

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

  async getSubspace(subspaceID: string, space: ISpace): Promise<ISpace> {
    return await this.getSubspaceInLevelZeroScopeOrFail(
      subspaceID,
      space.levelZeroSpaceID
    );
  }

  public async assignUserToRoles(roleSet: IRoleSet, agentInfo: AgentInfo) {
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

  async getSubspaceByNameIdInLevelZeroSpace(
    subspaceNameID: string,
    levelZeroSpaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | null> {
    const subspace = await this.spaceRepository.findOne({
      where: {
        nameID: subspaceNameID,
        levelZeroSpaceID: levelZeroSpaceID,
      },
      ...options,
    });

    return subspace;
  }

  async getSubspaceInLevelZeroScopeOrFail(
    subspaceID: string,
    levelZeroSpaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace> {
    const subspace = await this.getSubspaceByNameIdInLevelZeroSpace(
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
