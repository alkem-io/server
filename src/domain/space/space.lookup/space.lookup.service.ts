import { LogContext } from '@common/enums';
import { SpaceLevel } from '@common/enums/space.level';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { DRIZZLE } from '@config/drizzle/drizzle.constants';
import type { DrizzleDb } from '@config/drizzle/drizzle.constants';
import { ICollaboration } from '@domain/collaboration/collaboration/collaboration.interface';
import { IContributor } from '@domain/community/contributor/contributor.interface';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { eq, ne, inArray, and } from 'drizzle-orm';
import { AccountLookupService } from '../account.lookup/account.lookup.service';
import { spaces } from '../space/space.schema';
import { ISpace } from '../space/space.interface';
import { ISpaceAbout } from '../space.about';

type SpaceFindOptions = {
  relations?: Record<string, any>;
};

@Injectable()
export class SpaceLookupService {
  constructor(
    private accountLookupService: AccountLookupService,
    @Inject(DRIZZLE)
    private readonly db: DrizzleDb,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  async getSpaceOrFail(
    spaceID: string,
    options?: SpaceFindOptions
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
    options?: SpaceFindOptions
  ): Promise<ISpace | never> {
    const space = await this.getSpaceForSpaceAbout(spaceAboutID, options);
    if (!space)
      throw new EntityNotFoundException(
        `Unable to find Space with about with ID: ${spaceAboutID}`,
        LogContext.ACCOUNT
      );
    return space;
  }

  /**
   * Converts a `relations` object to a Drizzle `with` clause.
   * Boolean `true` values pass through directly.
   * Nested objects are wrapped in `{ with: { ... } }` for Drizzle's relational query syntax.
   */
  private buildWithClause(options?: SpaceFindOptions): Record<string, any> {
    if (!options?.relations) return {};
    return this.convertRelationsToWith(options.relations);
  }

  private convertRelationsToWith(relations: Record<string, any>): Record<string, any> {
    const withClause: any = {};
    for (const [key, value] of Object.entries(relations)) {
      if (value === true) {
        withClause[key] = true;
      } else if (typeof value === 'object' && value !== null) {
        withClause[key] = { with: this.convertRelationsToWith(value) };
      }
    }
    return withClause;
  }

  private async getSpace(
    spaceID: string,
    options?: SpaceFindOptions
  ): Promise<ISpace | null> {
    const withClause = this.buildWithClause(options);

    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.id, spaceID),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });
    return (space as unknown as ISpace) ?? null;
  }

  public async getSpaceByNameIdOrFail(
    spaceNameID: string,
    options?: SpaceFindOptions
  ): Promise<ISpace> {
    const withClause = this.buildWithClause(options);

    const space = await this.db.query.spaces.findFirst({
      where: and(
        eq(spaces.nameID, spaceNameID),
        eq(spaces.level, SpaceLevel.L0)
      ),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });
    if (!space) {
      throw new EntityNotFoundException(
        `Unable to find L0 Space with nameID: ${spaceNameID}`,
        LogContext.SPACES
      );
    }
    return space as unknown as ISpace;
  }

  public async getSubspaceByNameIdInLevelZeroSpace(
    subspaceNameID: string,
    levelZeroSpaceID: string,
    options?: SpaceFindOptions
  ): Promise<ISpace | null> {
    const withClause = this.buildWithClause(options);

    const subspace = await this.db.query.spaces.findFirst({
      where: and(
        eq(spaces.nameID, subspaceNameID),
        eq(spaces.levelZeroSpaceID, levelZeroSpaceID),
        ne(spaces.level, SpaceLevel.L0)
      ),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });

    return (subspace as unknown as ISpace) ?? null;
  }

  public async getSpaceForSpaceAbout(
    spaceAboutID: string,
    options?: SpaceFindOptions
  ): Promise<ISpace | null> {
    const withClause = this.buildWithClause(options);

    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.aboutId, spaceAboutID),
      ...(Object.keys(withClause).length > 0 ? { with: withClause } : {}),
    });
    return (space as unknown as ISpace) ?? null;
  }

  public async getFullSpaceHierarchy(spaceID: string): Promise<ISpace | null> {
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.id, spaceID),
      with: {
        subspaces: {
          with: {
            subspaces: true,
          },
        },
      },
    });
    return (space as unknown as ISpace) ?? null;
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

    const foundSpaces = await this.db.query.spaces.findMany({
      where: inArray(spaces.id, ids),
      columns: { id: true },
    });

    if (!foundSpaces.length) {
      return ids;
    }

    const notExist = [...ids];

    foundSpaces.forEach(space => {
      const idIndex = notExist.findIndex(x => x === space.id);

      if (idIndex >= -1) {
        notExist.splice(idIndex, 1);
      }
    });

    return notExist.length > 0 ? notExist : true;
  }

  public async getSpacesById(
    spaceIdsOrNameIds: string[]
  ) {
    const byId = await this.db.query.spaces.findMany({
      where: inArray(spaces.id, spaceIdsOrNameIds),
    });
    const byNameId = await this.db.query.spaces.findMany({
      where: inArray(spaces.nameID, spaceIdsOrNameIds),
    });

    // Deduplicate by ID
    const seen = new Set(byId.map(s => s.id));
    const merged = [...byId];
    for (const s of byNameId) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    }
    return merged as unknown as ISpace[];
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
    const space = await this.db.query.spaces.findFirst({
      where: eq(spaces.aboutId, spaceAbout.id),
    });
    if (!space) {
      this.logger.warn(
        `Unable to find Space for SpaceAbout: ${spaceAbout.id}`,
        LogContext.SPACES
      );
      return null;
    }
    return this.getProviderForSpace(space as unknown as ISpace);
  }

  /**
   * Gets the provider for a space that has already been loaded.
   * For L0 spaces (levelZeroSpaceID === space.id), skips the redundant L0 lookup.
   */
  public async getProviderForSpace(
    space: ISpace
  ): Promise<IContributor | null> {
    let l0Space: ISpace | null;

    if (space.levelZeroSpaceID === space.id) {
      // This is already the L0 space; just need to load account if not present
      if (space.account) {
        l0Space = space;
      } else {
        l0Space = await this.db.query.spaces.findFirst({
          where: eq(spaces.id, space.id),
          with: { account: true },
        }) as unknown as ISpace | null;
      }
    } else {
      l0Space = await this.db.query.spaces.findFirst({
        where: eq(spaces.id, space.levelZeroSpaceID),
        with: { account: true },
      }) as unknown as ISpace | null;
    }

    if (!l0Space || !l0Space.account) {
      this.logger.warn(
        `Unable to load Space with account to get Provider for Space: ${space.id}`,
        LogContext.SPACES
      );
      return null;
    }
    return await this.accountLookupService.getHost(l0Space.account as any);
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
