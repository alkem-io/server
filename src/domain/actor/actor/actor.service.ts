import { LogContext } from '@common/enums';
import { ActorType } from '@common/enums/actor.type';
import {
  EntityNotFoundException,
  EntityNotInitializedException,
} from '@common/exceptions';
import { ActorContextCacheService } from '@core/actor-context/actor.context.cache.service';
import {
  CreateCredentialInput,
  CredentialService,
  CredentialsSearchInput,
  ICredential,
} from '@domain/actor/credential';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AlkemioConfig } from '@src/types';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { FindOneOptions, Repository } from 'typeorm';
import { Actor } from './actor.entity';
import { IActor } from './actor.interface';

/**
 * Determines the ActorType of a given actor.
 * Uses the type discriminator field on IActor.
 */
export const getContributorType = (actor: IActor): ActorType => {
  if (!actor.type) {
    throw new Error(`Unable to determine contributor type for ${actor.id}`);
  }
  return actor.type;
};

/** @deprecated Use ActorAuthorizationService instead */
export {
  ActorAuthorizationService,
  ActorAuthorizationService as AgentAuthorizationService,
} from './actor.service.authorization';

/**
 * ActorService provides credential management operations for Actor entities.
 * This is the unified service replacing AgentService functionality.
 *
 * Note: During migration, this service will be populated with methods.
 * Initially it serves as a stub to be filled in Phase 2.
 */
@Injectable()
export class ActorService {
  private readonly cache_ttl: number;

  constructor(
    private configService: ConfigService<AlkemioConfig, true>,
    private credentialService: CredentialService,
    @InjectRepository(Actor)
    private actorRepository: Repository<Actor>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private actorContextCacheService: ActorContextCacheService
  ) {
    this.cache_ttl = this.configService.get(
      'identity.authentication.cache_ttl',
      { infer: true }
    );
  }

  /**
   * Get an actor by ID or throw if not found.
   */
  async getActorOrFail(
    actorID: string,
    options?: FindOneOptions<Actor>
  ): Promise<IActor | never> {
    const actor = await this.actorRepository.findOne({
      where: { id: actorID },
      ...options,
    });
    if (!actor) {
      throw new EntityNotFoundException(
        'No Actor found with the given id',
        LogContext.AUTH,
        { actorID }
      );
    }
    return actor;
  }

  /**
   * Get an actor by ID or return null if not found.
   */
  async getActorOrNull(actorID: string): Promise<IActor | null> {
    return await this.actorRepository.findOne({
      where: { id: actorID },
    });
  }

  /**
   * Save an actor entity.
   */
  async saveActor(actor: IActor): Promise<IActor> {
    return await this.actorRepository.save(actor as Actor);
  }

  /**
   * Delete an actor by ID.
   * Must be called AFTER the child entity (User, Org, etc.) has been removed,
   * because the child's FK (child.id → actor.id) must be gone first.
   */
  async deleteActorById(actorID: string): Promise<void> {
    await this.actorRepository.delete(actorID);
  }

  // =========================================================================
  // Credential Management Methods (to be implemented in Phase 2, Task 2.3)
  // =========================================================================

  private getActorCacheKey(actorID: string): string {
    return `@actor:id:${actorID}`;
  }

  private async getActorFromCache(id: string): Promise<IActor | undefined> {
    return await this.cacheManager.get<IActor>(this.getActorCacheKey(id));
  }

  private async setActorCache(actor: IActor): Promise<IActor> {
    const cacheKey = this.getActorCacheKey(actor.id);
    return await this.cacheManager.set<IActor>(cacheKey, actor, {
      ttl: this.cache_ttl,
    });
  }

  /**
   * Get actor credentials with caching.
   */
  async getActorCredentials(
    actorID: string
  ): Promise<{ actor: IActor; credentials: ICredential[] }> {
    let actor: IActor | undefined = await this.getActorFromCache(actorID);
    if (!actor || !actor.credentials) {
      actor = await this.getActorOrFail(actorID, {
        relations: { credentials: true },
      });

      if (actor) {
        await this.setActorCache(actor);
      }
      if (!actor.credentials) {
        throw new EntityNotInitializedException(
          'Actor credentials not initialized',
          LogContext.AUTH,
          { actorID }
        );
      }
    }
    return { actor, credentials: actor.credentials };
  }

  /**
   * Find all actors that have matching credentials.
   */
  async findActorsWithMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<IActor[]> {
    const matchingCredentials =
      await this.credentialService.findMatchingCredentials(credentialCriteria);

    const actors: IActor[] = [];
    for (const match of matchingCredentials) {
      const actor = match.actor;
      if (actor) {
        actors.push(actor);
      }
    }
    return actors;
  }

  /**
   * Check if an actor has a valid credential matching the criteria.
   */
  async hasValidCredential(
    actorID: string,
    credentialCriteria: CredentialsSearchInput
  ): Promise<boolean> {
    const { credentials } = await this.getActorCredentials(actorID);

    for (const credential of credentials) {
      if (credential.type === credentialCriteria.type) {
        if (!credentialCriteria.resourceID) return true;
        if (credentialCriteria.resourceID === credential.resourceID)
          return true;
      }
    }

    return false;
  }

  /**
   * Count actors with matching credentials.
   */
  async countActorsWithMatchingCredentials(
    credentialCriteria: CredentialsSearchInput
  ): Promise<number> {
    return await this.credentialService.countMatchingCredentials(
      credentialCriteria
    );
  }

  /**
   * Batch-count actors with matching credentials for multiple criteria.
   * Returns a Map from resourceID to count.
   */
  async countActorsWithMatchingCredentialsBatch(
    criteriaList: CredentialsSearchInput[]
  ): Promise<Map<string, number>> {
    return await this.credentialService.countMatchingCredentialsBatch(
      criteriaList
    );
  }

  // =========================================================================
  // Task 2.3: Credential Grant/Revoke Methods
  // =========================================================================

  /**
   * Grant a credential to an actor.
   */
  async grantCredentialOrFail(
    actorID: string,
    credentialData: CreateCredentialInput
  ): Promise<ICredential> {
    // Verify actor exists
    await this.getActorOrFail(actorID);

    // Create the credential with the actorID
    const credential = await this.credentialService.createCredentialForActor(
      actorID,
      credentialData
    );

    // Invalidate cache since credentials changed
    await this.invalidateActorCache(actorID);

    this.logger.verbose?.(
      `Granted credential type=${credentialData.type} to actor=${actorID}`,
      LogContext.AUTH
    );

    return credential;
  }

  /**
   * Revoke a credential from an actor.
   */
  async revokeCredential(
    actorID: string,
    credentialData: CredentialsSearchInput
  ): Promise<boolean> {
    // Verify actor exists
    await this.getActorOrFail(actorID);

    const resourceID = credentialData.resourceID || '';
    const deleted =
      await this.credentialService.deleteCredentialByTypeAndResource(
        actorID,
        credentialData.type,
        resourceID
      );

    if (deleted) {
      // Invalidate cache since credentials changed
      await this.invalidateActorCache(actorID);

      this.logger.verbose?.(
        `Revoked credential type=${credentialData.type} from actor=${actorID}`,
        LogContext.AUTH
      );
    }

    return deleted;
  }

  /**
   * Invalidate the actor cache.
   */
  private async invalidateActorCache(actorID: string): Promise<void> {
    const cacheKey = this.getActorCacheKey(actorID);
    await this.cacheManager.del(cacheKey);
    // Also invalidate the ActorContext cache so subsequent requests
    // pick up the updated credentials for myPrivileges evaluation
    await this.actorContextCacheService.deleteByActorID(actorID);
  }
}

/** @deprecated Use ActorService instead */
export const ContributorService = ActorService;
