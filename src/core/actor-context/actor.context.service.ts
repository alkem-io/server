import { AuthorizationCredential, LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { User } from '@domain/community/user/user.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { ActorContext } from './actor.context';
import { isAnonymousActor } from './is.anonymous.actor';

@Injectable()
export class ActorContextService {
  constructor(
    @InjectEntityManager('default')
    private readonly entityManager: EntityManager,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private readonly actorLookupService: ActorLookupService
  ) {}

  public createAnonymous(): ActorContext {
    const ctx = new ActorContext();
    const anonymousCredential: ICredentialDefinition = {
      type: AuthorizationCredential.GLOBAL_ANONYMOUS,
      resourceID: '',
    };
    ctx.credentials = [anonymousCredential];
    ctx.isAnonymous = true;
    ctx.isGuest = false;
    ctx.actorID = '';
    return ctx;
  }

  public createGuest(guestName: string): ActorContext {
    const ctx = new ActorContext();
    const guestCredential: ICredentialDefinition = {
      type: AuthorizationCredential.GLOBAL_GUEST,
      resourceID: '',
    };
    ctx.credentials = [guestCredential];
    ctx.guestName = guestName;
    ctx.actorID = '';
    ctx.isAnonymous = false;
    ctx.isGuest = true;
    return ctx;
  }

  /**
   * Populates the given ActorContext with credentials from the database.
   * Used when actorID is already known (from JWT token or metadata_public).
   * Only loads credentials - no user lookup needed.
   */
  public async populateFromActorID(
    ctx: ActorContext,
    actorID: string
  ): Promise<void> {
    ctx.actorID = actorID;
    ctx.credentials =
      await this.actorLookupService.getActorCredentialsOrFail(actorID);
  }

  /**
   * Builds an ActorContext for a user by their ID.
   */
  public async buildForUser(userId: string): Promise<ActorContext> {
    if (!userId) {
      return this.createAnonymous();
    }

    const user = await this.entityManager.findOneOrFail(User, {
      where: { id: userId },
      relations: {
        credentials: true,
      },
    });

    if (!user.credentials) {
      throw new EntityNotInitializedException(
        'Credentials not loaded for User',
        LogContext.AUTH,
        { userId }
      );
    }

    let credentials: ICredentialDefinition[] = [];

    if (user.credentials.length !== 0) {
      credentials = user.credentials.map(
        (credential: ICredential): ICredentialDefinition => {
          return {
            type: credential.type,
            resourceID: credential.resourceID,
          };
        }
      );
    }

    const ctx = new ActorContext();
    ctx.credentials = credentials;
    ctx.actorID = userId;
    ctx.authenticationID = user.authenticationID ?? undefined;
    return ctx;
  }

  /**
   * Builds an ActorContext from an actor ID.
   * Works for all actor types (User, Organization, VirtualContributor, Space, Account).
   * Credentials are loaded eagerly from the base actor table.
   */
  public async buildForActor(actorID: string): Promise<ActorContext> {
    const actor = await this.entityManager.findOne(Actor, {
      where: { id: actorID },
    });

    if (!actor) {
      return this.createAnonymous();
    }

    const ctx = new ActorContext();
    ctx.actorID = actor.id;
    ctx.isAnonymous = false;
    ctx.credentials = (actor.credentials ?? []).map(
      (credential: ICredential): ICredentialDefinition => ({
        type: credential.type,
        resourceID: credential.resourceID,
      })
    );
    return ctx;
  }

  public async resolveActorContext(
    actorID: string,
    guestName?: string
  ): Promise<ActorContext> {
    // is it guest?
    if (guestName && guestName.length > 0 && isAnonymousActor(actorID)) {
      return this.createGuest(normalizeGuestName(guestName));
    }
    // is it anonymous
    if (!guestName && isAnonymousActor(actorID)) {
      return this.createAnonymous();
    }
    // it's not a guest AND anonymous - it's probably a user
    // falls back to anonymous on failure
    return this.buildForActor(actorID);
  }
}

const normalizeGuestName = (guestName?: string): string => {
  const trimmed = guestName?.trim();
  return trimmed && trimmed.length > 0
    ? trimmed
    : `Guest collaborator ${randomUUID().slice(0, 8)}`;
};
