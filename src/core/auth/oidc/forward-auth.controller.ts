import { AuthenticationService } from '@core/authentication/authentication.service';
import { Controller, Get, Inject, Query, Req, Res } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { Request, Response } from 'express';
import type { SessionStoreHandle } from './session-store.redis';
import { SESSION_STORE_HANDLE } from './strategies/cookie-session.errors';
import { HydraBearerValidator } from './strategies/hydra-bearer.validator';

const HEADER_ACTOR_ID = 'X-Alkemio-Actor-Id';

/**
  Traefik ForwardAuth decision endpoint. Single source-of-truth for
  "who is this request" across every external service.

  Mounted under `/rest/internal/*` so it falls outside any public
  ingress/router rule (Traefik catches `/api/auth/*` publicly; nothing
  catches `/rest/internal/*` on the `web` entrypoint, so this path is
  unreachable from the internet by design). The ForwardAuth middleware
  reaches it directly via the server's container port.

  Identity sources tried in order:
    1. `alkemio_session` cookie     — browsers/SPA (BFF Redis-backed session)
    2. `Authorization: Bearer <jwt>` — API/M2M (Hydra-issued, JWKS-validated)
    3. `?guestName=` query param    — anonymous guest with display name

  Semantics: ALWAYS returns 200. Absence of `X-Alkemio-Actor-Id` signals
  anonymous; per-route policy decides what unauthenticated means for its
  upstream. Authenticated users get their canonical actor id; guests get
  the synthetic `guest-<uuid>` minted by ActorContextService.createGuest.

  Invalid bearer tokens (bad signature, expired, wrong audience, missing
  `alkemio_actor_id` claim) DO NOT 401 — they fall through to anonymous so a
  malformed Authorization header on a route that would otherwise serve guests
  is not promoted to a hard failure here. The strict 401 path lives in
  `HydraBearerStrategy` (passport) for routes that opt into it.

  Not for browser/SPA use — SPA identity lookups go via GraphQL `me`.
 */
@Controller('rest/internal')
export class ForwardAuthController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    @Inject(SESSION_STORE_HANDLE)
    private readonly sessionStore: SessionStoreHandle,
    private readonly hydraBearerValidator: HydraBearerValidator
  ) {}

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
    //    request actually carried `alkemio_session` — express-session
    //    auto-generates a sid for every request, so without this check the
    //    endpoint would attempt a BFF Redis lookup for unauthenticated traffic.
    const sid = req.cookies?.alkemio_session
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
      if (ctx.actorID) {
        res.setHeader(HEADER_ACTOR_ID, ctx.actorID);
      }
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
        // Bearer invalid → fall through to anonymous/guest below.
      }
    }

    // 3. Guest/anonymous fall-through. getActorContextFromBffPayload(null,
    //    guestName) reproduces the prior behaviour: guest with display name
    //    if provided, anonymous otherwise.
    const ctx = await this.authenticationService.getActorContextFromBffPayload(
      null,
      guestName
    );
    if (ctx.actorID) {
      res.setHeader(HEADER_ACTOR_ID, ctx.actorID);
    }
    res.status(200).end();
  }
}
