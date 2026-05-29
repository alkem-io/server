import { NonInteractiveLoginStrategy } from '@core/auth/non-interactive-login/non-interactive-login.strategy';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { Controller, Get, Inject, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { SessionStoreHandle } from './session-store.redis';
import { SESSION_STORE_HANDLE } from './strategies/cookie-session.errors';
import { HydraBearerValidator } from './strategies/hydra-bearer.validator';

const HEADER_ACTOR_ID = 'X-Alkemio-Actor-Id';

// auth-evaluation-service interprets the nil UUID as the anonymous caller
// (see authorization-evaluation-service/internal/service/validation.go).
// Downstream middlewares (e.g. file-service-go's ActorHeaderExtractor) require
// `X-Alkemio-Actor-Id` to ALWAYS be present so they can distinguish
// "gateway stamped: anonymous" from "gateway didn't run". Emitting this fixed
// value for un-credentialed traffic keeps the contract uniform while letting
// auth-eval still resolve GLOBAL_ANONYMOUS for public-read privileges.
const ANONYMOUS_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

/**
  Traefik ForwardAuth decision endpoint. Single source-of-truth for
  "who is this request" across every external service.

  Mounted under `/rest/internal/*` so it falls outside any public
  ingress/router rule (Traefik catches `/api/auth/*` publicly; nothing
  catches `/rest/internal/*` on the `web` entrypoint, so this path is
  unreachable from the internet by design). The ForwardAuth middleware
  reaches it directly via the server's container port.

  Identity sources tried in order:
    1. session cookie               — browsers/SPA (BFF Redis-backed session).
                                      Cookie name comes from
                                      `identity.authentication.providers.oidc.cookie.name`
                                      (env-suffixed per environment: `alkemio_session`,
                                      `alkemio_session_sandbox`, …).
    2. `Authorization: Bearer <jwt>` — API/M2M (Hydra-issued, JWKS-validated)
    3. `?guestName=` query param    — anonymous guest with display name

  Semantics: ALWAYS returns 200 AND ALWAYS stamps `X-Alkemio-Actor-Id`.
  Authenticated users get their canonical actor id; guests get the synthetic
  `guest-<uuid>` minted by ActorContextService.createGuest; un-credentialed
  callers get the nil-UUID sentinel (`ANONYMOUS_ACTOR_ID`), which
  auth-evaluation-service resolves to GLOBAL_ANONYMOUS. Downstream services
  (file-service-go, etc.) require the header to ALWAYS be present so they
  can distinguish "gateway stamped: anonymous" from "gateway didn't run".

  Invalid bearer tokens (bad signature, expired, wrong audience, missing
  `alkemio_actor_id` claim) DO NOT 401 — they fall through to anonymous so a
  malformed Authorization header on a route that would otherwise serve guests
  is not promoted to a hard failure here. The strict 401 path lives in
  `HydraBearerStrategy` (passport) for routes that opt into it.

  Not for browser/SPA use — SPA identity lookups go via GraphQL `me`.
 */
@Controller('rest/internal')
export class ForwardAuthController {
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

  @Get('forward-auth')
  async resolve(
    @Query('guestName') guestNameRaw: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');

    const guestName =
      typeof guestNameRaw === 'string' ? guestNameRaw : undefined;

    // 1. Cookie path — browsers/SPA. Bare sid post express-session signature
    //    verification (matches Redis key suffix). Only honour it when the
    //    request actually carried the session cookie — express-session
    //    auto-generates a sid for every request, so without this guard the
    //    endpoint would attempt a BFF Redis lookup for unauthenticated traffic.
    //    The cookie name is per-env
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
        // Store unreachable — surface 503 so Traefik returns the same to caller.
        res.status(503).end();
        return;
      }
    }

    if (cookiePayload) {
      const ctx =
        await this.authenticationService.getActorContextFromBffPayload(
          cookiePayload,
          guestName
        );
      res.setHeader(
        HEADER_ACTOR_ID,
        ctx.actorID && ctx.actorID.length > 0 ? ctx.actorID : ANONYMOUS_ACTOR_ID
      );
      res.status(200).end();
      return;
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
          res.setHeader(HEADER_ACTOR_ID, result.actorContext.actorID);
        }
        res.status(200).end();
        return;
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
        res.setHeader(HEADER_ACTOR_ID, niCtx.actorID);
        res.status(200).end();
        return;
      }
    }

    // 3. Guest/anonymous fall-through. getActorContextFromBffPayload(null,
    //    guestName) reproduces the prior behaviour: guest with display name
    //    if provided, anonymous otherwise.
    const ctx = await this.authenticationService.getActorContextFromBffPayload(
      null,
      guestName
    );
    // Always stamp the actor header. Authenticated/guest contexts carry their
    // own actorID; anonymous contexts get the nil-UUID sentinel that
    // auth-evaluation-service recognises as GLOBAL_ANONYMOUS. Downstream
    // services 401 on a missing header (by design), so omitting it here would
    // make public reads unreachable for unauthenticated callers.
    res.setHeader(
      HEADER_ACTOR_ID,
      ctx.actorID && ctx.actorID.length > 0 ? ctx.actorID : ANONYMOUS_ACTOR_ID
    );
    res.status(200).end();
  }
}
