import { AuthorizationCredential, LogContext } from '@common/enums';
import { EntityNotInitializedException } from '@common/exceptions/entity.not.initialized.exception';
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
        LogContext.WHITEBOARD_INTEGRATION,
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
   * Actor ID = entity ID (user.id, org.id, etc.)
   */
  public async buildForActor(
    actorId: string,
    options?: { includeCredentials?: boolean }
  ): Promise<ActorContext> {
    const user = await this.entityManager.findOne(User, {
      where: { id: actorId },
      relations: options?.includeCredentials ? { credentials: true } : {},
    });

    if (user) {
      const ctx = new ActorContext();
      ctx.actorId = user.id;
      ctx.isAnonymous = false;
      ctx.authenticationID = user.authenticationID || undefined;

      if (options?.includeCredentials && user.credentials) {
        ctx.credentials = user.credentials.map(
          (credential: ICredential): ICredentialDefinition => ({
            type: credential.type,
            resourceID: credential.resourceID,
          })
        );
      } else {
        ctx.credentials = [];
      }

      return ctx;
    }

    // Actor is not a user, return anonymous context with the actorId
    const ctx = new ActorContext();
    ctx.actorId = actorId;
    ctx.isAnonymous = true;
    ctx.credentials = [];
    return ctx;
  }
}
