import { Controller, Get, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ANONYMOUS_ACTOR_ID, HEADER_ACTOR_ID } from './constants';
import {
  ForwardAuthResolverService,
  SessionStoreUnavailableError,
} from './forward-auth.resolver.service';

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
    2. `Authorization: Bearer <jwt>` — API/M2M (Hydra-issued, JWKS-validated)
    3. `?guestName=` query param    — anonymous guest with display name
  …all resolved by the shared `ForwardAuthResolverService`.

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
  constructor(
    private readonly forwardAuthResolverService: ForwardAuthResolverService
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

    let ctx;
    try {
      ctx = await this.forwardAuthResolverService.resolveActorContext(
        req,
        guestName
      );
    } catch (err) {
      if (err instanceof SessionStoreUnavailableError) {
        // Store unreachable — surface 503 so Traefik returns the same to caller.
        res.status(503).end();
        return;
      }
      throw err;
    }

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
