import { ConfigService } from '@nestjs/config';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Session } from '@ory/kratos-client';
import { LogContext } from '@common/enums';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActorContext } from '@core/actor-context';
import { ActorContextCacheService } from '@core/actor-context';
import ConfigUtils from '@config/config.utils';
import { AlkemioConfig } from '@src/types';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { ActorContextService } from '@core/actor-context';

@Injectable()
export class AuthenticationService {
  private readonly extendSessionMinRemainingTTL: number | undefined; // min time before session expires when it's already allowed to be extended (in milliseconds)

  constructor(
    private actorContextCacheService: ActorContextCacheService,
    private actorContextService: ActorContextService,
    private configService: ConfigService<AlkemioConfig, true>,
    private kratosService: KratosService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    const { earliest_possible_extend } = this.configService.get(
      'identity.authentication.providers.ory',
      {
        infer: true,
      }
    );

    this.extendSessionMinRemainingTTL = this.parseEarliestPossibleExtend(
      earliest_possible_extend
    );
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
        const actorId = oryIdentity.metadata_public?.alkemio_actor_id;

        if (actorId) {
          return this.createActorContext(actorId, session);
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
   * Creates and returns an `ActorContext` based on the provided actorId.
   *
   * This method performs the following steps:
   * 1. Checks for cached context using actorId.
   * 2. Loads credentials from database if not cached.
   * 3. Caches the result using actorId as key.
   *
   * @param actorId - The Alkemio actor ID from the JWT token (set by identity resolver)
   * @param session - Optional Kratos session for expiry information
   */
  async createActorContext(
    actorId: string,
    session?: Session
  ): Promise<ActorContext> {
    if (!actorId) {
      return this.actorContextService.createAnonymous();
    }

    // Check cache first (using actorId as key)
    const cachedCtx = await this.actorContextCacheService.getByActorId(actorId);
    if (cachedCtx) {
      // Update expiry from current session
      if (session?.expires_at) {
        cachedCtx.expiry = new Date(session.expires_at).getTime();
      }
      return cachedCtx;
    }

    // Build context with actorId and expiry
    const ctx = new ActorContext();
    ctx.isAnonymous = false;
    if (session?.expires_at) {
      ctx.expiry = new Date(session.expires_at).getTime();
    }

    // Load credentials (actorId already known from token)
    await this.actorContextService.populateFromActorId(ctx, actorId);

    // Cache the result using actorId
    await this.actorContextCacheService.setByActorId(ctx);
    return ctx;
  }

  public async extendSession(sessionToBeExtended: Session): Promise<void> {
    const adminBearerToken = await this.kratosService.getBearerToken();

    return this.kratosService.tryExtendSession(
      sessionToBeExtended,
      adminBearerToken
    );
  }

  /**
   * Determines whether a session should be extended based on its expiration time and a minimum remaining TTL (Time To Live).
   *
   * @param session - The session object containing the expiration time.
   * @returns `true` if the session should be extended, `false` otherwise.
   *
   * The function checks the following conditions:
   * - If the session does not have an expiration time (`expires_at`) or the minimum remaining TTL (`extendSessionMinRemainingTTL`) is not set, it returns `false`.
   * - If the minimum remaining TTL is set to `-1`, it returns `true`, indicating that the session can be extended at any time.
   * - Otherwise, it calculates the session's expiry time and compares it with the current time plus the minimum remaining TTL to determine if the session should be extended.
   */
  public shouldExtendSession(session: Session): boolean {
    if (!session.expires_at || !this.extendSessionMinRemainingTTL) {
      return false;
    }
    if (this.extendSessionMinRemainingTTL === -1) {
      return true; // Set to -1 if specified as lifespan in config, meaning it can be extended at any time
    }

    const expiry = new Date(session.expires_at);
    return Date.now() >= expiry.getTime() - this.extendSessionMinRemainingTTL;
  }

  /**
   * Parses the `earliestPossibleExtend` parameter to determine the earliest possible time to extend a session.
   *
   * If the `earliestPossibleExtend` is set to 'lifespan', it returns -1, allowing sessions to be refreshed during their entire lifespan.
   * If the `earliestPossibleExtend` is a string, it attempts to parse it as a time duration in HMS format and returns the equivalent milliseconds.
   * If the parsing fails or the input is of an unexpected type, it returns `undefined`.
   *
   * @param earliestPossibleExtend - The input value representing the earliest possible time to extend a session. It can be 'lifespan' or a string in HMS format.
   * @returns The earliest possible extend time in milliseconds, -1 for 'lifespan', or `undefined` if the input is invalid.
   */
  private parseEarliestPossibleExtend(
    earliestPossibleExtend: unknown
  ): number | undefined {
    /**
     * If you need high flexibility when extending sessions, you can set earliest_possible_extend to lifespan,
     * which allows sessions to be refreshed during their entire lifespan, even right after they are created.
     * Source https://www.ory.sh/docs/kratos/session-management/refresh-extend-sessions
     */
    if (earliestPossibleExtend === 'lifespan') {
      return -1;
    }
    if (typeof earliestPossibleExtend === 'string') {
      const seconds = ConfigUtils.parseHMSString(earliestPossibleExtend);
      if (seconds) {
        return seconds * 1000;
      }
    }
    return undefined;
  }
}
