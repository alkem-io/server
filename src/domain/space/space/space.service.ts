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
import { ISpaceSettings } from '../space.settings/space.settings.interface';
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
import { CommunityRoleType } from '@common/enums/community.role';
import { SpaceLevel } from '@common/enums/space.level';
import { UpdateSpaceSettingsInput } from './dto/space.dto.update.settings';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { IStorageAggregator } from '@domain/storage/storage-aggregator/storage.aggregator.interface';
import { TemplatesSetService } from '@domain/template/templates-set/templates.set.service';
import { ITemplatesSet } from '@domain/template/templates-set/templates.set.interface';
import { ISpaceDefaults } from '../space.defaults/space.defaults.interface';
import { AgentType } from '@common/enums/agent.type';
import { StorageAggregatorType } from '@common/enums/storage.aggregator.type';
import { AccountHostService } from '../account.host/account.host.service';
import { AuthorizationPolicyType } from '@common/enums/authorization.policy.type';
import { LicenseCredential } from '@common/enums/license.credential';
import { LicensePrivilege } from '@common/enums/license.privilege';
import { LicenseEngineService } from '@core/license-engine/license.engine.service';
import { ISpaceSubscription } from './space.license.subscription.interface';
import { IAccount } from '../account/account.interface';
import { LicensingService } from '@platform/licensing/licensing.service';
import { LicensePlanType } from '@common/enums/license.plan.type';
import { TemplateType } from '@common/enums/template.type';
import { CreateCollaborationInput } from '@domain/collaboration/collaboration/dto/collaboration.dto.create';
import { CreateInnovationFlowInput } from '@domain/collaboration/innovation-flow/dto/innovation.flow.dto.create';
import { TemplateService } from '@domain/template/template/template.service';
import { templatesSetDefaults } from '../space.defaults/definitions/space.defaults.templates';
import { InputCreatorService } from '@services/api/input-creator/input.creator.service';
import { RoleSetService } from '@domain/access/role-set/role.set.service';
import { IRoleSet } from '@domain/access/role-set/role.set.interface';

@Injectable()
export class SpaceService {
  constructor(
    private accountHostService: AccountHostService,
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
    private templatesSetService: TemplatesSetService,
    private collaborationService: CollaborationService,
    private licensingService: LicensingService,
    private licenseEngineService: LicenseEngineService,
    private templateService: TemplateService,
    private inputCreatorService: InputCreatorService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  public async createSpace(
    spaceData: CreateSpaceInput,
    spaceDefaults?: ISpaceDefaults,
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
    space.settingsStr = this.spaceSettingsService.serializeSettings(
      this.spaceDefaultsService.getDefaultSpaceSettings(spaceData.type)
    );

    const storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        StorageAggregatorType.SPACE,
        spaceData.storageAggregatorParent
      );
    space.storageAggregator = storageAggregator;

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
        entryRoleType: CommunityRoleType.MEMBER,
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
    const collaborationData: CreateCollaborationInput =
      spaceData.collaborationData;
    if (!collaborationData.innovationFlowData) {
      // TODO: need to pick up the default template + innovation flow properly
      collaborationData.innovationFlowData =
        await this.getDefaultInnovationStates(space.type, spaceDefaults);
    }
    if (!collaborationData.calloutsData) {
      collaborationData.calloutsData = [];
    }
    const addDefaultCallouts = spaceData.collaborationData.addDefaultCallouts;
    if (addDefaultCallouts === undefined || addDefaultCallouts) {
      const defaultCallouts = this.spaceDefaultsService.getDefaultCallouts(
        space.type
      );
      collaborationData.calloutsData.push(...defaultCallouts);
    }

    collaborationData.calloutGroups =
      this.spaceDefaultsService.getCalloutGroups(space.type);
    collaborationData.defaultCalloutGroupName =
      this.spaceDefaultsService.getCalloutGroupDefault(space.type);
    space.collaboration = await this.collaborationService.createCollaboration(
      collaborationData,
      space.storageAggregator,
      agentInfo
    );

    space.agent = await this.agentService.createAgent({
      type: AgentType.SPACE,
    });

    if (space.level === SpaceLevel.SPACE) {
      await this.addLevelZeroSpaceEntities(space);
    }

    ////// Community
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

  private async addDefaultTemplatesToSpaceLibrary(
    templatesSet: ITemplatesSet,
    storageAggregator: IStorageAggregator
  ): Promise<ITemplatesSet> {
    return await this.templatesSetService.addTemplates(
      templatesSet,
      templatesSetDefaults.posts,
      templatesSetDefaults.innovationFlows,
      storageAggregator
    );
  }

  private async addLevelZeroSpaceEntities(space: ISpace) {
    if (!space.storageAggregator) {
      throw new EntityNotInitializedException(
        `'storage aggregator not set on level zero space '${space.id}'`,
        LogContext.SPACES
      );
    }
    space.library = await this.templatesSetService.createTemplatesSet();
    space.defaults = await this.spaceDefaultsService.createSpaceDefaults();

    // And set the defaults
    space.library = await this.addDefaultTemplatesToSpaceLibrary(
      space.library,
      space.storageAggregator
    );
    if (space.defaults && space.library && space.library.templates) {
      const innovationFlowTemplates = space.library.templates.filter(
        template => template.type === TemplateType.INNOVATION_FLOW
      );
      if (innovationFlowTemplates.length > 0) {
        space.defaults.innovationFlowTemplate = innovationFlowTemplates[0];
      }
    }
  }

  async save(space: ISpace): Promise<ISpace> {
    return await this.spaceRepository.save(space);
  }

  async deleteSpace(deleteData: DeleteSpaceInput): Promise<ISpace> {
    const space = await this.getSpaceOrFail(deleteData.ID, {
      relations: {
        subspaces: true,
        collaboration: true,
        community: true,
        context: true,
        agent: true,
        profile: true,
        storageAggregator: true,
        library: true,
        defaults: true,
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
      !space.authorization
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
    await this.collaborationService.deleteCollaboration(space.collaboration.id);
    await this.communityService.removeCommunity(space.community.id);
    await this.profileService.deleteProfile(space.profile.id);
    await this.agentService.deleteAgent(space.agent.id);
    await this.authorizationPolicyService.delete(space.authorization);

    if (space.level === SpaceLevel.SPACE) {
      if (!space.library || !space.defaults) {
        throw new RelationshipNotFoundException(
          `Unable to load entities to delete base subspace: ${space.id} `,
          LogContext.SPACES
        );
      }
      await this.templatesSetService.deleteTemplatesSet(space.library.id);
      await this.spaceDefaultsService.deleteSpaceDefaults(space.defaults.id);
    }

    await this.storageAggregatorService.delete(space.storageAggregator.id);

    const result = await this.spaceRepository.remove(space as Space);
    result.id = deleteData.ID;
    return result;
  }

  private async getDefaultInnovationStates(
    spaceType: SpaceType,
    spaceDefaults?: ISpaceDefaults
  ): Promise<CreateInnovationFlowInput> {
    if (
      spaceDefaults &&
      (spaceType === SpaceType.CHALLENGE || spaceType === SpaceType.OPPORTUNITY)
    ) {
      // If no argument is provided, then use the default template for the space, if set
      // for spaces of type challenge or opportunity
      const innovationFlowTemplateID = spaceDefaults.innovationFlowTemplate?.id;
      if (innovationFlowTemplateID) {
        const template = await this.templateService.getTemplateOrFail(
          innovationFlowTemplateID,
          {
            relations: {
              innovationFlow: {
                profile: true,
              },
            },
          }
        );
        const innovationFlow = template.innovationFlow;
        if (!innovationFlow) {
          throw new RelationshipNotFoundException(
            `unable to get innovation flow for template ${template.id}`,
            LogContext.SPACES
          );
        }
        return await this.inputCreatorService.buildCreateInnovationFlowInputFromInnovationFlow(
          innovationFlow
        );
      }
    }

    // If no default template is set, then pick up the default based on the specified type
    const innovationFlowStatesDefault =
      this.spaceDefaultsService.getDefaultInnovationFlowStates(spaceType);
    const result: CreateInnovationFlowInput = {
      profile: {
        displayName: 'default',
        description: 'default flow',
      },
      states: innovationFlowStatesDefault,
    };
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
    const sortedSpaces = spacesData.sort((a, b) => {
      const visibilityA = a.visibility;
      const visibilityB = b.visibility;
      if (
        visibilityA !== visibilityB &&
        (visibilityA === SpaceVisibility.DEMO ||
          visibilityB === SpaceVisibility.DEMO)
      )
        return visibilityA === SpaceVisibility.DEMO ? 1 : -1;

      if (
        a.authorization?.anonymousReadAccess === true &&
        b.authorization?.anonymousReadAccess === false
      )
        return -1;
      if (
        a.authorization?.anonymousReadAccess === false &&
        b.authorization?.anonymousReadAccess === true
      )
        return 1;

      if (!a.subspaces && b.subspaces) return 1;
      if (a.subspaces && !b.subspaces) return -1;
      if (!a.subspaces && !b.subspaces) return 0;

      // Shouldn't get there
      if (!a.subspaces || !b.subspaces)
        throw new ValidationException(
          `Critical error when comparing Spaces! Critical error when loading Subspaces for Space ${a} and Space ${b}`,
          LogContext.SPACES
        );

      const subspacesCountA = this.getSubspaceAndSubsubspacesCount(
        a?.subspaces
      );
      const subspacesCountB = this.getSubspaceAndSubsubspacesCount(
        b?.subspaces
      );

      if (subspacesCountA > subspacesCountB) return -1;
      if (subspacesCountA < subspacesCountB) return 1;

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

  async getLicensePrivileges(space: ISpace): Promise<LicensePrivilege[]> {
    let spaceAgent = space.agent;
    if (!space.agent) {
      const accountWithAgent = await this.getSpaceOrFail(space.id, {
        relations: {
          agent: {
            credentials: true,
          },
        },
      });
      spaceAgent = accountWithAgent.agent;
    }
    if (!spaceAgent) {
      throw new EntityNotFoundException(
        `Unable to find agent with credentials for Space: ${space.id}`,
        LogContext.ACCOUNT
      );
    }
    const privileges =
      await this.licenseEngineService.getGrantedPrivileges(spaceAgent);
    return privileges;
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
        Object.values(LicenseCredential).includes(
          credential.type as LicenseCredential
        )
      ) {
        subscriptions.push({
          name: credential.type as LicenseCredential,
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
    // Get the defaults to use
    const spaceDefaults = await this.getDefaultsOrFail(space.levelZeroSpaceID);

    // Update the subspace data being passed in to set the storage aggregator to use
    subspaceData.storageAggregatorParent = space.storageAggregator;
    subspaceData.level = space.level + 1;
    let subspace = await this.createSpace(
      subspaceData,
      spaceDefaults,
      agentInfo
    );

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
    role: CommunityRoleType,
    type: CommunityContributorType
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

  public async getLevelZeroSpaceAgent(space: ISpace): Promise<IAgent> {
    const levelZeroSpace = await this.getSpaceOrFail(space.levelZeroSpaceID, {
      relations: {
        agent: true,
      },
    });
    if (!levelZeroSpace.agent) {
      throw new RelationshipNotFoundException(
        `Agent not initialised on Level Zero Space: ${levelZeroSpace.id}`,
        LogContext.SPACES
      );
    }
    return levelZeroSpace.agent;
  }

  public async assignUserToRoles(roleSet: IRoleSet, agentInfo: AgentInfo) {
    await this.roleSetService.assignUserToRole(
      roleSet,
      CommunityRoleType.MEMBER,
      agentInfo.userID,
      agentInfo
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      CommunityRoleType.LEAD,
      agentInfo.userID,
      agentInfo
    );

    await this.roleSetService.assignUserToRole(
      roleSet,
      CommunityRoleType.ADMIN,
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

  public getSettings(space: ISpace): ISpaceSettings {
    return this.spaceSettingsService.getSettings(space.settingsStr);
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
    const settings = this.spaceSettingsService.getSettings(space.settingsStr);
    const updatedSettings = this.spaceSettingsService.updateSettings(
      settings,
      settingsData
    );
    space.settingsStr =
      this.spaceSettingsService.serializeSettings(updatedSettings);
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

  async getLibraryOrFail(rootSpaceID: string): Promise<ITemplatesSet> {
    const levelZeroSpaceWithLibrary = await this.getSpaceOrFail(rootSpaceID, {
      relations: {
        library: true,
      },
    });
    const templatesSet = levelZeroSpaceWithLibrary.library;

    if (!templatesSet) {
      throw new EntityNotFoundException(
        `Unable to find templatesSet for level zero space with id: ${rootSpaceID}`,
        LogContext.ACCOUNT
      );
    }

    return templatesSet;
  }

  public async activeSubscription(
    space: ISpace
  ): Promise<ISpaceSubscription | undefined> {
    const licensingFramework =
      await this.licensingService.getDefaultLicensingOrFail();

    const today = new Date();
    const plans = await this.licensingService.getLicensePlans(
      licensingFramework.id
    );

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
      .filter(item => item.plan?.type === LicensePlanType.SPACE_PLAN)
      .sort((a, b) => b.plan!.sortOrder - a.plan!.sortOrder)?.[0]?.subscription;
  }

  async getDefaultsOrFail(rootSpaceID: string): Promise<ISpaceDefaults> {
    const levelZeroSpaceWithDefaults = await this.getSpaceOrFail(rootSpaceID, {
      relations: {
        defaults: {
          innovationFlowTemplate: {
            profile: true,
          },
        },
      },
    });
    const defaults = levelZeroSpaceWithDefaults.defaults;

    if (!defaults) {
      throw new EntityNotFoundException(
        `Unable to find Defaults for level zero space with id: ${rootSpaceID}`,
        LogContext.ACCOUNT
      );
    }

    return defaults;
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
    const provider = await this.accountHostService.getHost(space.account);
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
    const collaboration = await this.getCollaborationOrFail(space.id);

    return await this.collaborationService.getPostsCount(collaboration);
  }

  public async getWhiteboardsCount(space: ISpace): Promise<number> {
    const collaboration = await this.getCollaborationOrFail(space.id);
    return await this.collaborationService.getWhiteboardsCount(collaboration);
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
