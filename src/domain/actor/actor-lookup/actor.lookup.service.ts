import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { EntityManager, FindOneOptions, In } from 'typeorm';
import { isUUID } from 'class-validator';
import { ActorType } from '@common/enums/actor.type';
import { IActorFull } from '@domain/actor/actor/actor.interface';
import { Actor } from '@domain/actor/actor/actor.entity';
import { User } from '@domain/community/user/user.entity';
import { Organization } from '@domain/community/organization/organization.entity';
import { VirtualContributor } from '@domain/community/virtual-contributor/virtual.contributor.entity';
import { Space } from '@domain/space/space/space.entity';
import { Account } from '@domain/space/account/account.entity';
import {
  EntityNotFoundException,
  RelationshipNotFoundException,
} from '@common/exceptions';
import { AuthorizationCredential, LogContext } from '@common/enums';
import { IAuthorizationPolicy } from '@domain/common/authorization-policy/authorization.policy.interface';
import {
  Credential,
  CredentialsSearchInput,
  ICredential,
} from '@domain/actor/credential';

@Injectable()
export class ActorLookupService {
  constructor(
    @InjectEntityManager('default')
    private entityManager: EntityManager
  ) {}

  /**
   * Returns the ActorType for a given actor ID.
   * Single query to the actor table using the type discriminator column.
   */
  async getActorTypeById(actorId: string): Promise<ActorType | null> {
    if (!isUUID(actorId)) {
      return null;
    }

    const actor = await this.entityManager.findOne(Actor, {
      where: { id: actorId },
      select: { type: true },
    });

    return actor?.type ?? null;
  }

  /**
   * Checks if the actor matches the specified type(s).
   * Pass a single type or multiple types to check against.
   */
  async isType(actorId: string, ...types: ActorType[]): Promise<boolean> {
    const actorType = await this.getActorTypeById(actorId);
    return actorType !== null && types.includes(actorType);
  }

  /**
   * Checks if an actor with the given ID exists.
   * Single query - no entity loading.
   */
  async actorExists(actorId: string): Promise<boolean> {
    if (!isUUID(actorId)) {
      return false;
    }
    const count = await this.entityManager.count(Actor, {
      where: { id: actorId },
    });
    return count > 0;
  }

  /**
   * Get fully hydrated actor by ID with all child-specific fields.
   * Returns the full actor (User, Organization, VirtualContributor, Space, or Account).
   * Only use when you need child-specific fields (nameID, email, phone, etc.).
   * For type checks, use getActorTypeById() instead.
   * For existence checks, use actorExists() instead.
   * For lightweight actor (id, type, profile only), use getActorById().
   */
  async getFullActorById(
    actorId: string,
    options?: FindOneOptions<IActorFull>
  ): Promise<IActorFull | null> {
    if (!isUUID(actorId)) {
      return null;
    }

    // First get the type to know which table to query
    const type = await this.getActorTypeById(actorId);
    if (!type) {
      return null;
    }

    // Query the appropriate child table based on type
    switch (type) {
      case ActorType.USER:
        return this.entityManager.findOne(User, {
          ...options,
          where: { ...options?.where, id: actorId },
        });
      case ActorType.ORGANIZATION:
        return this.entityManager.findOne(Organization, {
          ...options,
          where: { ...options?.where, id: actorId },
        });
      case ActorType.VIRTUAL:
        return this.entityManager.findOne(VirtualContributor, {
          ...options,
          where: { ...options?.where, id: actorId },
        });
      case ActorType.SPACE:
        return this.entityManager.findOne(Space, {
          ...options,
          where: { ...options?.where, id: actorId },
        });
      case ActorType.ACCOUNT:
        return this.entityManager.findOne(Account, {
          ...options,
          where: { ...options?.where, id: actorId },
        });
      default:
        return null;
    }
  }

  /**
   * Get fully hydrated actor or throw if not found.
   * Only use when you need child-specific fields (nameID, email, phone, etc.).
   */
  async getFullActorByIdOrFail(
    actorId: string,
    options?: FindOneOptions<IActorFull>
  ): Promise<IActorFull> {
    const actor = await this.getFullActorById(actorId, options);
    if (!actor) {
      throw new EntityNotFoundException(
        'Actor not found',
        LogContext.COMMUNITY,
        { actorId }
      );
    }
    return actor;
  }

  /**
   * Get the type and verify actor exists, or throw.
   * Use this when you need the type but not the full entity.
   */
  async getActorTypeByIdOrFail(actorId: string): Promise<ActorType> {
    const type = await this.getActorTypeById(actorId);
    if (!type) {
      throw new EntityNotFoundException(
        'Actor not found',
        LogContext.COMMUNITY,
        { actorId }
      );
    }
    return type;
  }

  /**
   * Validate that all actors exist and return their types.
   * Single query using WHERE id IN (...).
   * Throws if any actor is not found.
   * Use this for batch operations where you need to validate existence and get types.
   */
  async validateActorsAndGetTypes(
    actorIds: string[]
  ): Promise<Map<string, ActorType>> {
    if (actorIds.length === 0) {
      return new Map();
    }

    // Filter out invalid UUIDs
    const validIds = actorIds.filter(id => isUUID(id));
    if (validIds.length !== actorIds.length) {
      const invalidIds = actorIds.filter(id => !isUUID(id));
      throw new EntityNotFoundException(
        'Invalid actor ID format',
        LogContext.COMMUNITY,
        { invalidIds }
      );
    }

    const actors = await this.entityManager.find(Actor, {
      where: { id: In(validIds) },
      select: { id: true, type: true },
    });

    // Check if all actors were found
    if (actors.length !== validIds.length) {
      const foundIds = new Set(actors.map(a => a.id));
      const missingIds = validIds.filter(id => !foundIds.has(id));
      throw new EntityNotFoundException(
        'One or more actors not found',
        LogContext.COMMUNITY,
        { missingIds }
      );
    }

    return new Map(actors.map(a => [a.id, a.type]));
  }

  /**
   * Get authorization policy for any actor without loading the full entity.
   * Works for User, Organization, VirtualContributor, Space, Account.
   * Use when you only need the authorization policy.
   */
  async getActorAuthorizationOrFail(
    actorId: string
  ): Promise<IAuthorizationPolicy> {
    if (!isUUID(actorId)) {
      throw new EntityNotFoundException(
        'Invalid actor ID format',
        LogContext.COMMUNITY,
        { actorId }
      );
    }

    const actor = await this.entityManager.findOne(Actor, {
      where: { id: actorId },
      relations: { authorization: true },
    });

    if (!actor) {
      throw new EntityNotFoundException(
        'Actor not found',
        LogContext.COMMUNITY,
        { actorId }
      );
    }

    if (!actor.authorization) {
      throw new RelationshipNotFoundException(
        'Actor authorization not initialized',
        LogContext.AUTH,
        { actorId }
      );
    }

    return actor.authorization;
  }

  /**
   * Get lightweight Actor from base table.
   * Queries Actor base table directly - does NOT load child-specific fields.
   * Use this when you only need: id, type, profile, credentials.
   * For full actor with child fields (nameID, email, phone, etc.), use getFullActorById().
   * @param options - Optional relations to load (profile loaded by default)
   */
  async getActorById(
    actorId: string,
    options?: FindOneOptions<Actor>
  ): Promise<Actor | null> {
    if (!isUUID(actorId)) {
      return null;
    }

    return this.entityManager.findOne(Actor, {
      ...options,
      where: { ...options?.where, id: actorId },
      relations: { profile: true, ...options?.relations },
    });
  }

  /**
   * Get lightweight Actor or throw if not found.
   * Use this when you only need: id, type, profile, credentials.
   * @param options - Optional relations to load (profile loaded by default)
   */
  async getActorByIdOrFail(
    actorId: string,
    options?: FindOneOptions<Actor>
  ): Promise<Actor> {
    const actor = await this.getActorById(actorId, options);
    if (!actor) {
      throw new EntityNotFoundException(
        'Actor not found',
        LogContext.COMMUNITY,
        { actorId }
      );
    }
    return actor;
  }

  /**
   * Get credentials for an actor by ID.
   * Efficient query that only loads credentials, not the full actor entity.
   * Used by authentication flow when actorId is already known from JWT.
   * @returns Array of credentials, empty array if actor not found
   */
  async getActorCredentials(actorId: string): Promise<ICredential[]> {
    if (!isUUID(actorId)) {
      return [];
    }

    const actor = await this.entityManager.findOne(Actor, {
      where: { id: actorId },
      relations: { credentials: true },
      select: { id: true },
    });

    return actor?.credentials ?? [];
  }

  /**
   * Get credentials for an actor or throw if actor not found.
   * Used when actor MUST exist (e.g., authenticated request with actorId from JWT).
   */
  async getActorCredentialsOrFail(actorId: string): Promise<ICredential[]> {
    if (!isUUID(actorId)) {
      throw new EntityNotFoundException(
        'Invalid actor ID format',
        LogContext.AUTH,
        { actorId }
      );
    }

    const actor = await this.entityManager.findOne(Actor, {
      where: { id: actorId },
      relations: { credentials: true },
      select: { id: true },
    });

    if (!actor) {
      throw new EntityNotFoundException('Actor not found', LogContext.AUTH, {
        actorId,
      });
    }

    return actor.credentials ?? [];
  }

  /**
   * Query actors with a given credential, optionally filtered by type.
   * With CTI, TypeORM returns the correct concrete entity instances.
   */
  async actorsWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    actorTypes?: ActorType[],
    limit?: number
  ): Promise<Actor[]> {
    return this.entityManager.find(Actor, {
      where: {
        ...(actorTypes?.length && { type: In(actorTypes) }),
        credentials: {
          type: credentialCriteria.type,
          resourceID: credentialCriteria.resourceID || '',
        },
      },
      take: limit,
    });
  }

  /**
   * Get actor IDs with a given credential, optionally filtered by type.
   * More efficient than actorsWithCredentials when you only need IDs.
   * Single query returning only the id column.
   */
  async getActorIdsWithCredential(
    credentialCriteria: CredentialsSearchInput,
    actorTypes?: ActorType[],
    limit?: number
  ): Promise<string[]> {
    const actors = await this.entityManager.find(Actor, {
      where: {
        ...(actorTypes?.length && { type: In(actorTypes) }),
        credentials: {
          type: credentialCriteria.type,
          resourceID: credentialCriteria.resourceID || '',
        },
      },
      select: { id: true },
      take: limit,
    });
    return actors.map(a => a.id);
  }

  /**
   * Count actors with a given credential, optionally filtered by type.
   */
  async countActorsWithCredentials(
    credentialCriteria: CredentialsSearchInput,
    actorTypes?: ActorType[]
  ): Promise<number> {
    return this.entityManager.count(Actor, {
      where: {
        ...(actorTypes?.length && { type: In(actorTypes) }),
        credentials: {
          type: credentialCriteria.type,
          resourceID: credentialCriteria.resourceID || '',
        },
      },
    });
  }

  /**
   * Get all actors managed by a user (the user itself, orgs they manage, and VCs in those accounts).
   */
  async getActorsManagedByUser(userID: string): Promise<IActorFull[]> {
    // Query User directly to avoid circular dependency with UserLookupService
    const user = await this.entityManager.findOne(User, {
      where: { id: userID },
    });
    if (!user) {
      throw new EntityNotFoundException(
        'User not found',
        LogContext.COMMUNITY,
        {
          userId: userID,
        }
      );
    }

    // Get organizations where user is owner/admin via credentials
    const orgCredentials = await this.entityManager.find(Credential, {
      where: {
        actorId: userID,
        type: In([
          AuthorizationCredential.ORGANIZATION_OWNER,
          AuthorizationCredential.ORGANIZATION_ADMIN,
        ]),
      },
    });

    const orgIDs = orgCredentials.map(c => c.resourceID);
    const organizations =
      orgIDs.length > 0
        ? await this.entityManager.find(Organization, {
            where: { id: In(orgIDs) },
          })
        : [];

    // Collect all account IDs (user's + organizations')
    const accountIDs = [
      user.accountID,
      ...organizations.map(org => org.accountID),
    ];

    // Get all VCs managed by these accounts in one query
    const virtualContributors = await this.entityManager.find(
      VirtualContributor,
      {
        where: { account: { id: In(accountIDs) } },
      }
    );

    return [user, ...organizations, ...virtualContributors];
  }
}
