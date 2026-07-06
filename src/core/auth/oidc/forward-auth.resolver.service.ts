import { ActorContext } from '@core/actor-context/actor.context';
import { NonInteractiveLoginStrategy } from '@core/auth/non-interactive-login/non-interactive-login.strategy';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import type { SessionStoreHandle } from './session-store.redis';
import { SESSION_STORE_HANDLE } from './strategies/cookie-session.errors';
import { HydraBearerValidator } from './strategies/hydra-bearer.validator';

/**
 * Sentinel thrown by {@link ForwardAuthResolverService.resolveActorContext}
 * when the BFF session store is unreachable — callers translate this into a
 * 503 so Traefik propagates it.
 */
export class SessionStoreUnavailableError extends Error {}

/**
 * Shared identity resolution for the Traefik forwardAuth decision endpoints.
 * Tries the same identity sources used across the platform — cookie (BFF
 * session) → Hydra RS256 bearer → non-interactive-login HS256 bearer → guest /
 * anonymous — and returns the resolved {@link ActorContext} (with credentials,
 * usable for authorization decisions).
 *
 * Used by both the universal `/rest/internal/forward-auth` endpoint (which
 * always 200s and stamps the actor header) and the assistant edge
 * `/rest/internal/assistant-forward-auth` endpoint (which additionally gates on
 * the `ACCESS_VIRTUAL_ASSISTANT` privilege). Extracting it here keeps the two
 * routes byte-identical in how they resolve "who is this request".
 */
@Injectable()
export class ForwardAuthResolverService {
  private readonly sessionCookieName: string;

  constructor(
    private readonly authenticationService: AuthenticationService,
    @Inject(SESSION_STORE_HANDLE)
    private readonly sessionStore: SessionStoreHandle,
    private readonly hydraBearerValidator: HydraBearerValidator,
    private readonly nonInteractiveLoginStrategy: NonInteractiveLoginStrategy,
    configService: ConfigService<AlkemioConfig, true>
  ) {
    this.sessionCookieName = configService.get(
      'identity.authentication.providers.oidc.cookie.name',
      { infer: true }
    );
  }

  /**
   * Resolves the acting ActorContext from a request. Throws
   * {@link SessionStoreUnavailableError} when the BFF session store is
   * unreachable; never throws for an absent/invalid credential (falls through
   * to guest/anonymous, matching forwardAuth semantics).
   */
  public async resolveActorContext(
    req: Request,
    guestName?: string
  ): Promise<ActorContext> {
    // 1. Cookie path — browsers/SPA. Bare sid post express-session signature
    //    verification (matches Redis key suffix). Only honour it when the
    //    request actually carried the session cookie — express-session
    //    auto-generates a sid for every request, so without this guard the
    //    endpoint would attempt a BFF Redis lookup for unauthenticated traffic.
    //    The cookie name is per-env.
    const sid = req.cookies?.[this.sessionCookieName]
      ? typeof req.sessionID === 'string' && req.sessionID.length > 0
        ? req.sessionID
        : undefined
      : undefined;

    let cookiePayload = null;
    if (sid) {
      try {
        cookiePayload = await this.sessionStore.get(sid);
      } catch {
        throw new SessionStoreUnavailableError();
      }
    }

    if (cookiePayload) {
      return this.authenticationService.getActorContextFromBffPayload(
        cookiePayload,
        guestName
      );
    }

    // 2. Bearer path — API/M2M. JWKS-validated Hydra access token (RS256).
    //    Validator throws BearerValidationError on any failure; forwardAuth
    //    semantics require us to swallow that and fall through to anonymous
    //    rather than 401 the caller.
    const auth = req.headers['authorization'];
    if (typeof auth === 'string') {
      const correlationId = randomUUID();
      try {
        const result =
          await this.hydraBearerValidator.validateAuthorizationHeader(
            auth,
            correlationId,
            correlationId
          );
        if (result.actorContext.actorID) {
          return result.actorContext;
        }
      } catch {
        // Bearer invalid as Hydra RS256 → try the HS256 non-interactive-login
        // path below before giving up.
      }

      // 2b. Non-interactive-login bearer path — HS256 self-signed tokens
      //     minted by `/api/auth/non-interactive-login`. Mirrors the GraphQL
      //     Passport chain (Hydra → non-interactive-login fall-through) so
      //     forwardAuth-protected REST routes (file-service,
      //     collaborative-document) accept the same test bearers GraphQL does.
      //     Strategy.validate returns null when the feature is disabled or the
      //     token is not an HS256 non-interactive-login JWT, so this is inert
      //     in production.
      const niCtx = await this.nonInteractiveLoginStrategy.validate(req);
      if (niCtx?.actorID) {
        return niCtx;
      }
    }

    // 3. Guest/anonymous fall-through. getActorContextFromBffPayload(null,
    //    guestName) reproduces the prior behaviour: guest with display name if
    //    provided, anonymous otherwise.
    return this.authenticationService.getActorContextFromBffPayload(
      null,
      guestName
    );
  }
}
