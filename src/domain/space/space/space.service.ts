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
import { ICommunityPolicy } from '@domain/community/community-policy/community.policy.interface';
import { IProfile } from '@domain/common/profile/profile.interface';
import { InnovationHub, InnovationHubType } from '@domain/innovation-hub/types';
import { OperationNotAllowedException } from '@common/exceptions/operation.not.allowed.exception';
import { IPaginatedType } from '@core/pagination/paginated.type';
import { SpaceFilterInput } from '@services/infrastructure/space-filter/dto/space.filter.dto.input';
import { PaginationArgs } from '@core/pagination';
import { getPaginationResults } from '@core/pagination/pagination.fn';
import { SpaceMembershipCollaborationInfo } from '@services/api/me/space.membership.type';
import { ISpaceSettings } from '../space.settings/space.settings.interface';
import { SpaceType } from '@common/enums/space.type';
import { IAccount } from '../account/account.interface';
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
import { CommunityRole } from '@common/enums/community.role';
import { SpaceLevel } from '@common/enums/space.level';
import { UpdateSpaceSettingsInput } from './dto/space.dto.update.settings';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { CommunityContributorType } from '@common/enums/community.contributor.type';
import { CommunityRoleService } from '@domain/community/community-role/community.role.service';

@Injectable()
export class SpaceService {
  constructor(
    private authorizationPolicyService: AuthorizationPolicyService,
    private spacesFilterService: SpaceFilterService,
    private contextService: ContextService,
    private agentService: AgentService,
    private communityService: CommunityService,
    private communityRoleService: CommunityRoleService,
    private namingService: NamingService,
    private profileService: ProfileService,
    private spaceSettingsService: SpaceSettingsService,
    private spaceDefaultsService: SpaceDefaultsService,
    private storageAggregatorService: StorageAggregatorService,
    private collaborationService: CollaborationService,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async createSpace(
    spaceData: CreateSpaceInput,
    account: IAccount,
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
    space.visibility = SpaceVisibility.DEMO;

    space.authorization = new AuthorizationPolicy();
    space.account = account;
    space.settingsStr = this.spaceSettingsService.serializeSettings(
      this.spaceDefaultsService.getDefaultSpaceSettings(spaceData.type)
    );

    const storageAggregator =
      await this.storageAggregatorService.createStorageAggregator(
        spaceData.storageAggregatorParent
      );
    space.storageAggregator = storageAggregator;

    const communityPolicy = this.spaceDefaultsService.getCommunityPolicy(
      space.level
    );
    const applicationFormData =
      this.spaceDefaultsService.getCommunityApplicationForm(space.level);

    const communityData: CreateCommunityInput = {
      name: spaceData.profileData.displayName,
      policy: communityPolicy,
      applicationForm: applicationFormData,
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

    if (!spaceData.context) {
      spaceData.context = {};
    }
    space.context = await this.contextService.createContext(spaceData.context);

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
    await this.profileService.addVisualOnProfile(
      space.profile,
      VisualType.AVATAR
    );
    await this.profileService.addVisualOnProfile(
      space.profile,
      VisualType.BANNER
    );
    await this.profileService.addVisualOnProfile(
      space.profile,
      VisualType.CARD
    );

    //// Collaboration

    space.collaboration = await this.collaborationService.createCollaboration(
      {
        ...spaceData.collaborationData,
      },
      space.storageAggregator,
      account,
      space.type
    );

    const calloutGroupDefault =
      this.spaceDefaultsService.getCalloutGroupDefault(space.type);
    await this.collaborationService.addCalloutGroupTagsetTemplate(
      space.collaboration,
      calloutGroupDefault
    );

    const calloutInputsFromCollaborationTemplate =
      await this.collaborationService.createCalloutInputsFromCollaborationTemplate(
        spaceData.collaborationData?.collaborationTemplateID
      );
    const defaultCallouts = this.spaceDefaultsService.getDefaultCallouts(
      space.type
    );
    const calloutInputs =
      await this.spaceDefaultsService.getCreateCalloutInputs(
        defaultCallouts,
        calloutInputsFromCollaborationTemplate,
        spaceData.collaborationData
      );
    space.collaboration = await this.collaborationService.addDefaultCallouts(
      space.collaboration,
      calloutInputs,
      space.storageAggregator,
      agentInfo?.userID
    );

    /////////// Agents

    space.agent = await this.agentService.createAgent({
      parentDisplayID: `${space.nameID}`,
    });

    await this.save(space);

    if (spaceData.level === SpaceLevel.SPACE) {
      space.levelZeroSpaceID = space.id;
    }

    ////// Community
    // set immediate community parent + resourceID
    space.community.parentID = space.id;
    space.community.policy =
      await this.communityService.updateCommunityPolicyResourceID(
        space.community,
        space.id
      );

    return await this.save(space);
  }

  async save(space: ISpace): Promise<ISpace> {
    return await this.spaceRepository.save(space);
  }

  async deleteSpace(deleteData: DeleteSpaceInput): Promise<ISpace> {
    const space = await this.getSpaceOrFail(deleteData.ID, {
      relations: {
        subspaces: true,
      },
    });

    if (!space.subspaces) {
      throw new RelationshipNotFoundException(
        `Unable to load all entities for deletion of space ${space.id} `,
        LogContext.SPACES
      );
    }

    // Do not remove a space that has subspaces, require these to be individually first removed
    if (space.subspaces.length > 0)
      throw new OperationNotAllowedException(
        `Unable to remove Space (${space.nameID}) as it contains ${space.subspaces.length} subspaces`,
        LogContext.SPACES
      );

    await this.deleteEntities(space.id);

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

  public async getSpacesWithChildJourneys(
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
          visibility: In(visibilities),
          level: SpaceLevel.SPACE,
        },
        ...options,
        relations: {
          ...options?.relations,
          collaboration: true,
          subspaces: {
            collaboration: true,
            subspaces: {
              collaboration: true,
            },
          },
        },
      });
    } else {
      spaces = await this.spaceRepository.find({
        where: {
          visibility: In(visibilities),
          level: SpaceLevel.SPACE,
        },
        ...options,
        relations: {
          ...options?.relations,
          collaboration: true,
          subspaces: {
            collaboration: true,
            subspaces: {
              collaboration: true,
            },
          },
        },
      });
    }

    if (spaces.length === 0) return [];

    return spaces;
  }

  // Returns a map of all collaboration IDs with parent space ID
  public getSpaceMembershipCollaborationInfo(
    spaces: ISpace[]
  ): SpaceMembershipCollaborationInfo {
    const spaceMembershipCollaborationInfo: SpaceMembershipCollaborationInfo =
      new Map();

    for (const space of spaces) {
      if (space.collaboration?.id)
        spaceMembershipCollaborationInfo.set(space.collaboration.id, space.id);

      if (space.subspaces) {
        for (const subspace of space.subspaces) {
          if (subspace.collaboration?.id)
            spaceMembershipCollaborationInfo.set(
              subspace.collaboration.id,
              space.id
            );

          if (subspace.subspaces) {
            for (const subsubspace of subspace.subspaces) {
              if (subsubspace.collaboration?.id)
                spaceMembershipCollaborationInfo.set(
                  subsubspace.collaboration.id,
                  space.id
                );
            }
          }
        }
      }
    }
    return spaceMembershipCollaborationInfo;
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
    }
    if (updateData.nameID && updateData.nameID !== space.nameID) {
      // updating the nameID, check new value is allowed
      const updateAllowed = await this.isNameIdAvailable(updateData.nameID);
      if (!updateAllowed) {
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

  async isNameIdAvailable(nameID: string): Promise<boolean> {
    const spaceCount = await this.spaceRepository.countBy({
      nameID: nameID,
    });
    if (spaceCount != 0) return false;

    // check restricted space names
    const restrictedSpaceNames = ['user', 'organization'];
    if (restrictedSpaceNames.includes(nameID.toLowerCase())) return false;

    return true;
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

  async createSubspace(
    subspaceData: CreateSubspaceInput,
    agentInfo?: AgentInfo
  ): Promise<ISpace> {
    const space = await this.getSpaceOrFail(subspaceData.spaceID, {
      relations: {
        account: true,
        storageAggregator: true,
        community: true,
      },
    });
    if (!space.account || !space.storageAggregator || !space.community) {
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
    subspaceData.level = space.level + 1;
    let subspace = await this.createSpace(
      subspaceData,
      space.account,
      agentInfo
    );

    subspace = await this.addSubspaceToSpace(space, subspace);

    // Before assigning roles in the subspace check that the user is a member
    if (agentInfo) {
      const agent = await this.agentService.getAgentOrFail(agentInfo?.agentID);
      const isMember = await this.communityRoleService.isMember(
        agent,
        space.community
      );
      if (isMember) {
        await this.assignUserToRoles(subspace, agentInfo);
      }
    }

    return subspace;
  }

  async addSubspaceToSpace(space: ISpace, subspace: ISpace): Promise<ISpace> {
    if (!space.community)
      throw new ValidationException(
        `Unable to add Subspace to space, missing relations: ${space.id}`,
        LogContext.SPACES
      );

    // Set the parent space directly, avoiding saving the whole parent
    subspace.parentSpace = space;
    subspace.levelZeroSpaceID = space.levelZeroSpaceID;

    // Finally set the community relationship
    await this.setCommunityHierarchyForSubspace(
      space.community,
      subspace.community
    );

    return await this.save(subspace);
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
    role: CommunityRole,
    type: CommunityContributorType
  ) {
    if (!space.community) {
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

    await this.communityRoleService.assignContributorAgentToRole(
      space.community,
      contributor.agent,
      role,
      type
    );
  }

  public async assignUserToRoles(
    space: ISpace,
    agentInfo: AgentInfo | undefined
  ) {
    if (!space.community) {
      throw new EntityNotInitializedException(
        `Community not initialised on Space: ${space.id}`,
        LogContext.SPACES
      );
    }
    if (agentInfo) {
      await this.communityRoleService.assignUserToRole(
        space.community,
        agentInfo.userID,
        CommunityRole.MEMBER,
        agentInfo
      );

      await this.communityRoleService.assignUserToRole(
        space.community,
        agentInfo.userID,
        CommunityRole.LEAD,
        agentInfo
      );

      await this.communityRoleService.assignUserToRole(
        space.community,
        agentInfo.userID,
        CommunityRole.ADMIN,
        agentInfo
      );
    }
  }

  public async update(spaceData: UpdateSpaceInput): Promise<ISpace> {
    const space = await this.getSpaceOrFail(spaceData.ID, {
      relations: {
        account: true,
        context: true,
        community: true,
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

  private async deleteEntities(spaceID: string) {
    const space = await this.getSpaceOrFail(spaceID, {
      relations: {
        collaboration: true,
        community: true,
        context: true,
        agent: true,
        profile: true,
        storageAggregator: true,
      },
    });

    if (
      !space.collaboration ||
      !space.community ||
      !space.context ||
      !space.agent ||
      !space.profile ||
      !space.storageAggregator ||
      !space.authorization
    ) {
      throw new RelationshipNotFoundException(
        `Unable to load entities to delete base subspace: ${space.id} `,
        LogContext.SPACES
      );
    }

    await this.contextService.removeContext(space.context.id);
    await this.collaborationService.deleteCollaboration(space.collaboration.id);
    await this.communityRoleService.removeAllCommunityRoles(space.community);
    await this.communityService.removeCommunity(space.community.id);
    await this.profileService.deleteProfile(space.profile.id);
    await this.agentService.deleteAgent(space.agent.id);
    await this.authorizationPolicyService.delete(space.authorization);

    await this.storageAggregatorService.delete(space.storageAggregator.id);
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

  public async setCommunityHierarchyForSubspace(
    parentCommunity: ICommunity,
    childCommunity: ICommunity | undefined
  ) {
    if (!childCommunity) {
      throw new RelationshipNotFoundException(
        `Unable to set subspace community relationship, child community not provied: ${parentCommunity.id}`,
        LogContext.SPACES
      );
    }
    // Finally set the community relationship
    await this.communityService.setParentCommunity(
      childCommunity,
      parentCommunity
    );
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

  public async getAccountOrFail(spaceId: string): Promise<IAccount> {
    const space = await this.spaceRepository.findOne({
      where: { id: spaceId },
      relations: {
        account: true,
      },
    });

    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find base subspace with ID: ${spaceId}`,
        LogContext.SPACES
      );
    }

    return space.account;
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

  public async getCommunityPolicy(spaceId: string): Promise<ICommunityPolicy> {
    const community = await this.getCommunity(spaceId);
    return this.communityService.getCommunityPolicy(community);
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

  public async getStorageAggregatorOrFail(spaceID: string): Promise<IContext> {
    const space = await this.getSpaceOrFail(spaceID, {
      relations: {
        storageAggregator: true,
      },
    });
    const storageAggregator = space.storageAggregator;
    if (!storageAggregator)
      throw new RelationshipNotFoundException(
        `Unable to load storage aggregator for space ${spaceID} `,
        LogContext.CONTEXT
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

  public async getMembersCount(space: ISpace): Promise<number> {
    const community = await this.getCommunity(space.id);
    return await this.communityRoleService.getMembersCount(community);
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

    const community = await this.getCommunity(space.id);

    // Members
    const membersCount =
      await this.communityRoleService.getMembersCount(community);
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
