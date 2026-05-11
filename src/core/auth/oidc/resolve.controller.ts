import { AuthenticationService } from '@core/authentication/authentication.service';
import { Controller, Get, Inject, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { SessionStoreHandle } from './session-store.redis';
import { SESSION_STORE_HANDLE } from './strategies/cookie-session.errors';

const HEADER_ACTOR_ID = 'X-Alkemio-Actor-Id';

/**
  Decision endpoint. The single source-of-truth for
  "who is this request" across every external service

  Semantics: ALWAYS returns 200. Absence of `X-Alkemio-Actor-Id` signals
  anonymous; per-route policy decides what unauthenticated means for its
  upstream. Authenticated users get their canonical actor id; guests get
  the synthetic `guest-<uuid>` minted by ActorContextService.createGuest.

  Not exposed for browser/SPA use.
  Reachable only internally
  SPA identity lookups go via GraphQL `me`.
 */
@Controller('api/auth')
export class ResolveController {
  constructor(
    private readonly authenticationService: AuthenticationService,
    @Inject(SESSION_STORE_HANDLE)
    private readonly sessionStore: SessionStoreHandle
  ) {}

  @Get('resolve')
  async resolve(
    @Query('guestName') guestNameRaw: string | undefined,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<void> {
    res.setHeader('Cache-Control', 'no-store');

    // Bare sid post express-session signature verification (matches the Redis
    // key suffix). Only honour it when the request actually carried the
    // alkemio_session cookie — express-session auto-generates a sid for every
    // request, so without this check the endpoint would attempt a BFF Redis
    // lookup for unauthenticated traffic.
    const sid = req.cookies?.alkemio_session
      ? typeof req.sessionID === 'string' && req.sessionID.length > 0
        ? req.sessionID
        : undefined
      : undefined;

    let payload = null;
    if (sid) {
      try {
        payload = await this.sessionStore.get(sid);
      } catch {
        // Store unreachable — surface 503
        res.status(503).end();
        return;
      }
    }

    const guestName =
      typeof guestNameRaw === 'string' ? guestNameRaw : undefined;

    const ctx = await this.authenticationService.getActorContextFromBffPayload(
      payload,
      guestName
    );

    if (ctx.actorID) {
      res.setHeader(HEADER_ACTOR_ID, ctx.actorID);
    }
    res.status(200).end();
  }
}
