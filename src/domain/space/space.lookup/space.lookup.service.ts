import { LogContext } from '@common/enums';
import { Injectable, Inject, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ISpace } from '../space/space.interface';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { Space } from '../space/space.entity';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  FindManyOptions,
  FindOneOptions,
  In,
  Not,
  Repository,
} from 'typeorm';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { AccountLookupService } from '../account.lookup/account.lookup.service';
import { ISpaceAbout } from '../space.about';
import { SpaceLevel } from '@common/enums/space.level';

@Injectable()
export class SpaceLookupService {
  constructor(
    private accountLookupService: AccountLookupService,
    @InjectEntityManager('default')
    private entityManager: EntityManager,
    @InjectRepository(Space)
    private spaceRepository: Repository<Space>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getSpaceOrFail(
    spaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | never> {
    const space = await this.getSpace(spaceID, options);
    if (!space)
      throw new EntityNotFoundException(
        `Unable to find Space on Host with ID: ${spaceID}`,
        LogContext.ACCOUNT
      );
    return space;
  }

  public async getSpaceForSpaceAboutOrFail(
    spaceAboutID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | never> {
    const space = await this.getSpaceForSpaceAbout(spaceAboutID, options);
    if (!space)
      throw new EntityNotFoundException(
        `Unable to find Space with about with ID: ${spaceAboutID}`,
        LogContext.ACCOUNT
      );
    return space;
  }

  private async getSpace(
    spaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | null> {
    const space: ISpace | null = await this.entityManager.findOne(Space, {
      ...options,
      where: { ...options?.where, id: spaceID },
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

  public async getSubspaceByNameIdInLevelZeroSpace(
    subspaceNameID: string,
    levelZeroSpaceID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | null> {
    const subspace = await this.spaceRepository.findOne({
      where: {
        nameID: subspaceNameID,
        levelZeroSpaceID: levelZeroSpaceID,
        level: Not(SpaceLevel.L0),
      },
      ...options,
    });

    return subspace;
  }

  public async getSpaceForSpaceAbout(
    spaceAboutID: string,
    options?: FindOneOptions<Space>
  ): Promise<ISpace | null> {
    const space: ISpace | null = await this.entityManager.findOne(Space, {
      ...options,
      where: {
        ...options?.where,
        about: {
          id: spaceAboutID,
        },
      },
    });
    return space;
  }

  public async getFullSpaceHierarchy(spaceID: string): Promise<ISpace | null> {
    const space: ISpace | null = await this.entityManager.findOne(Space, {
      where: { id: spaceID },
      relations: {
        subspaces: {
          subspaces: true,
        },
      },
    });
    return space;
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

  /**
   * Retrieves a collaboration for a given space ID or throws if not found.
   * @throws {RelationshipNotFoundException} if collaboration is not found.
   * @throws {EntityNotFoundException} if space is not found.
   */
  public async getCollaborationOrFail(
    spaceID: string
  ): Promise<ICollaboration> {
    const subspaceWithCollaboration = await this.getSpaceOrFail(spaceID, {
      relations: { collaboration: true },
    });
    const collaboration = subspaceWithCollaboration.collaboration;
    if (!collaboration)
      throw new RelationshipNotFoundException(
        `Unable to load collaboration for space ${spaceID} `,
        LogContext.COLLABORATION
      );
    return collaboration;
  }

  public async getProvider(
    spaceAbout: ISpaceAbout
  ): Promise<IContributor | null> {
    const space = await this.spaceRepository.findOne({
      where: {
        about: {
          id: spaceAbout.id,
        },
      },
    });
    if (!space) {
      this.logger.warn(
        `Unable to find Space for SpaceAbout: ${spaceAbout.id}`,
        LogContext.SPACES
      );
      return null;
    }
    const l0Space = await this.spaceRepository.findOne({
      where: {
        id: space.levelZeroSpaceID,
      },
      relations: {
        account: true,
      },
    });
    if (!l0Space || !l0Space.account) {
      this.logger.warn(
        `Unable to load Space with account to get Provider for SpaceAbout: ${spaceAbout.id}`,
        LogContext.SPACES
      );
      return null;
    }
    return await this.accountLookupService.getHost(l0Space.account);
  }

  /**
   * Gets all descendant space IDs for a given space.
   * This includes direct subspaces (L1) and their subspaces (L2), etc.
   * Uses Set for deduplication and includes safety guards against circular references.
   * @param spaceID The parent space ID
   * @returns Array of all descendant space IDs
   */
  async getAllDescendantSpaceIDs(spaceID: string): Promise<string[]> {
    return this.getAllDescendantSpaceIDsRecursive(spaceID, new Set(), 10, 0);
  }

  /**
   * Private recursive implementation for getting descendant space IDs.
   * Internal parameters are hidden from public API to prevent bypassing safety mechanisms.
   * @param spaceID The current space ID to process
   * @param visited Set of already visited space IDs to prevent circular references
   * @param maxDepth Maximum recursion depth (10 to prevent stack overflow)
   * @param currentDepth Current recursion depth
   * @returns Array of descendant space IDs from this branch
   */
  private async getAllDescendantSpaceIDsRecursive(
    spaceID: string,
    visited: Set<string>,
    maxDepth: number,
    currentDepth: number
  ): Promise<string[]> {
    // Safety guard: prevent infinite recursion
    if (currentDepth >= maxDepth) {
      this.logger.warn(
        'Max recursion depth reached for space',
        LogContext.SPACES,
        { maxDepth, spaceID }
      );
      return [];
    }

    // Safety guard: prevent circular references
    if (visited.has(spaceID)) {
      this.logger.warn(
        'Circular reference detected for space',
        LogContext.SPACES,
        { spaceID }
      );
      return [];
    }

    visited.add(spaceID);

    const spaceWithSubspaces = await this.getSpaceOrFail(spaceID, {
      relations: {
        subspaces: true,
      },
    });

    const subspaces = spaceWithSubspaces.subspaces;
    if (!subspaces || subspaces.length === 0) {
      return [];
    }

    const descendantIDs = new Set<string>();

    // Add direct subspaces and recursively get their descendants
    for (const subspace of subspaces) {
      descendantIDs.add(subspace.id);

      // Recursively get subspaces of this subspace
      const childDescendants = await this.getAllDescendantSpaceIDsRecursive(
        subspace.id,
        visited,
        maxDepth,
        currentDepth + 1
      );
      childDescendants.forEach(id => descendantIDs.add(id));
    }

    return Array.from(descendantIDs);
  }
}
