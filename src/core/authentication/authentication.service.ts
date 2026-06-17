import { LogContext } from '@common/enums';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextCacheService } from '@core/actor-context/actor.context.cache.service';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { isAbsoluteTtlExceeded } from '@core/auth/oidc/absolute-ttl.guard';
import type { AlkemioSessionPayload } from '@core/auth/oidc/session-store.redis';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Session } from '@ory/kratos-client';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class AuthenticationService {
  constructor(
    private actorContextCacheService: ActorContextCacheService,
    private actorContextService: ActorContextService,
    private kratosService: KratosService,
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
   * Gets ActorContext by validating a Kratos session via cookie or authorization header.
   * Used by integration services (collaborative-document, whiteboard, file) that authenticate
   * via direct session validation rather than pre-parsed JWT tokens.
   *
   * This method:
   * 1. Validates session with Kratos using cookie/authorization
   * 2. Extracts alkemio_actor_id from session identity metadata_public
   * 3. Returns ActorContext (or anonymous/guest if no valid session)
   */
  public async getActorContext(opts: {
    cookie?: string;
    authorization?: string;
    guestName?: string;
  }): Promise<ActorContext> {
    let session: Session | undefined;
    try {
      session = await this.kratosService.getSession(
        opts.authorization,
        opts.cookie
      );
      if (session?.identity) {
        const oryIdentity = session.identity as OryDefaultIdentitySchema;
        const actorID = oryIdentity.metadata_public?.alkemio_actor_id;

        if (actorID) {
          return this.createActorContext(actorID, session);
        }

        this.logger.warn?.(
          'Session identity missing alkemio_actor_id in metadata_public',
          LogContext.AUTH
        );
      }
    } catch (error) {
      this.logger.verbose?.(
        `Session validation failed, falling back to guest/anonymous: ${error}`,
        LogContext.AUTH
      );
    }

    if (opts.guestName?.trim()) {
      return this.actorContextService.createGuest(opts.guestName.trim());
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
   * @param actorID - The Alkemio actor ID from the JWT token (set by identity resolver)
   * @param session - Optional Kratos session for expiry information
   */
  async createActorContext(
    actorID: string,
    session?: Session
  ): Promise<ActorContext> {
    if (!actorID) {
      return this.actorContextService.createAnonymous();
    }

    // Check cache first (using actorID as key)
    const cachedCtx = await this.actorContextCacheService.getByActorID(actorID);
    if (cachedCtx) {
      // Update expiry from current session
      if (session?.expires_at) {
        cachedCtx.expiry = new Date(session.expires_at).getTime();
      }
      return cachedCtx;
    }

    // Build context with actorID and expiry
    const ctx = new ActorContext();
    ctx.isAnonymous = false;
    if (session?.expires_at) {
      ctx.expiry = new Date(session.expires_at).getTime();
    }

    // Load credentials (actorID already known from token)
    try {
      await this.actorContextService.populateFromActorID(ctx, actorID);
    } catch {
      // Actor not found in DB (e.g. stale alkemio_actor_id after DB reset)
      this.logger.warn?.(
        `Actor not found for actorID from token, falling back to anonymous`,
        LogContext.AUTH
      );
      return this.actorContextService.createAnonymous();
    }

    // Cache the result using actorID
    await this.actorContextCacheService.setByActorID(ctx);
    return ctx;
  }
}
