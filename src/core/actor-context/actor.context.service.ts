import { AuthorizationCredential, LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
import { Actor } from '@domain/actor/actor/actor.entity';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { ICredentialDefinition } from '@domain/actor/credential/credential.definition.interface';
import { ICredential } from '@domain/actor/credential/credential.interface';
import { User } from '@domain/community/user/user.entity';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';
import { ActorContext } from './actor.context';

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
    ctx.isAnonymous = false;
    return ctx;
  }

  /**
   * Populates the given ActorContext with credentials from the database.
   * Used when actorId is already known (from JWT token or metadata_public).
   * Only loads credentials - no user lookup needed.
   */
  public async populateFromActorId(
    ctx: ActorContext,
    actorId: string
  ): Promise<void> {
    ctx.actorId = actorId;
    ctx.credentials =
      await this.actorLookupService.getActorCredentialsOrFail(actorId);
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
    ctx.actorId = userId;
    ctx.authenticationID = user.authenticationID ?? undefined;
    return ctx;
  }

  /**
   * Builds an ActorContext from an actor ID.
   * Works for all actor types (User, Organization, VirtualContributor, Space, Account).
   * Credentials are loaded eagerly from the base actor table.
   */
  public async buildForActor(actorId: string): Promise<ActorContext> {
    const actor = await this.entityManager.findOne(Actor, {
      where: { id: actorId },
    });

    if (!actor) {
      return this.createAnonymous();
    }

    const ctx = new ActorContext();
    ctx.actorId = actor.id;
    ctx.isAnonymous = false;
    ctx.credentials = (actor.credentials ?? []).map(
      (credential: ICredential): ICredentialDefinition => ({
        type: credential.type,
        resourceID: credential.resourceID,
      })
    );
    return ctx;
  }
}
