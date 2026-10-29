import { LogContext } from '@common/enums';
import { EntityNotFoundException } from '@common/exceptions';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextCacheService } from '@core/actor-context/actor.context.cache.service';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { isAbsoluteTtlExceeded } from '@core/auth/oidc/absolute-ttl.guard';
import type { AlkemioSessionPayload } from '@core/auth/oidc/session-store.redis';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AuthenticationService {
  constructor(
    private actorContextCacheService: ActorContextCacheService,
    private actorContextService: ActorContextService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {}

  /**
   * Resolves an ActorContext from a pre-loaded BFF session payload (from
   * Redis), or a guest name, or neither. Used by the universal traefik
   * forwardAuth decision endpoint (`/rest/internal/forward-auth`).
   *
   * The caller (ForwardAuthController) does the Redis lookup itself because the
   * SessionStoreHandle binding lives in OidcModule's DI scope. This method
   * receives the already-loaded payload and does only the
   * actor-vs-guest-vs-anonymous decision via the existing primitives:
   *   - valid payload + alkemio_actor_id → `createActorContext(actor_id)`
   *   - else guestName                    → `createGuest(guestName)`
   *   - else                              → `createAnonymous()`
   *
   * Tombstone + absolute-TTL gates mirror `CookieSessionStrategy.validate`;
   * a failing payload falls through to guest/anonymous rather than raising —
   * the decision endpoint never throws, downstream routes enforce.
   */
  public async getActorContextFromBffPayload(
    payload: AlkemioSessionPayload | null,
    guestName?: string
  ): Promise<ActorContext> {
    if (
      payload &&
      !payload.terminated_at &&
      !isAbsoluteTtlExceeded(payload) &&
      payload.alkemio_actor_id
    ) {
      return this.createActorContext(payload.alkemio_actor_id);
    }
    if (guestName?.trim()) {
      return this.actorContextService.createGuest(guestName.trim());
    }
    return this.actorContextService.createAnonymous();
  }

  /**
   * Creates and returns an `ActorContext` based on the provided actorID.
   *
   * This method performs the following steps:
   * 1. Checks for cached context using actorID.
   * 2. Loads credentials from database if not cached.
   * 3. Caches the result using actorID as key.
   *
   * @param actorID - The Alkemio actor ID (resolved from the BFF session payload,
   *   a Hydra bearer token, or a non-interactive-login token)
   */
  async createActorContext(actorID: string): Promise<ActorContext> {
    if (!actorID) {
      return this.actorContextService.createAnonymous();
    }

    const ctx = await this.loadActorContext(actorID, { writeCache: true });
    if (!ctx) {
      // Actor not found in DB (e.g. stale alkemio_actor_id after DB reset)
      this.logger.warn?.(
        `Actor not found for actorID from token, falling back to anonymous`,
        LogContext.AUTH
      );
      return this.actorContextService.createAnonymous();
    }
    return ctx;
  }

  /**
   * The ActorContext an actor's own requests would carry, for work done on
   * their behalf outside any request of theirs (for example recomputing a
   * notification counter for every receiver of an event). Same credentials
   * as `createActorContext`, with two differences:
   * - the built context is never written to the cache, so a fan-out does not
   *   fill it with actors who are not signed in or add a writer racing the
   *   invalidation that runs when credentials change;
   * - an actor that cannot be loaded throws instead of becoming anonymous,
   *   because an anonymous context would silently evaluate access as nobody.
   */
  async createActorContextWithoutCaching(
    actorID: string
  ): Promise<ActorContext> {
    const ctx = await this.loadActorContext(actorID, { writeCache: false });
    if (!ctx) {
      throw new EntityNotFoundException(
        'Unable to build ActorContext: actor not found',
        LogContext.AUTH,
        { actorID }
      );
    }
    return ctx;
  }

  /**
   * The one place an actor's ActorContext is built from its ID: the cached
   * context when present, otherwise its credentials loaded from the
   * database. Resolves to undefined when the actor cannot be loaded.
   */
  private async loadActorContext(
    actorID: string,
    { writeCache }: { writeCache: boolean }
  ): Promise<ActorContext | undefined> {
    const cachedCtx = await this.actorContextCacheService.getByActorID(actorID);
    if (cachedCtx) {
      return cachedCtx;
    }

    const ctx = new ActorContext();
    ctx.isAnonymous = false;
    try {
      await this.actorContextService.populateFromActorID(ctx, actorID);
    } catch {
      return undefined;
    }

    if (writeCache) {
      await this.actorContextCacheService.setByActorID(ctx);
    }
    return ctx;
  }
}
