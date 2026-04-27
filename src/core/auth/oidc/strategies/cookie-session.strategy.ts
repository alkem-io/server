import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-custom';
import { isAbsoluteTtlExceeded } from '../absolute-ttl.guard';
import type {
  AlkemioSessionPayload,
  SessionStoreHandle,
} from '../session-store.redis';
import {
  COOKIE_SESSION_NAME,
  CookieSessionContext,
  SESSION_STORE_HANDLE,
  SessionStoreUnavailableError,
} from './cookie-session.errors';
import { AUTH_STRATEGY_OIDC_COOKIE_SESSION } from './strategy.names';

type RequestWithSession = Request & {
  alkemioSession?: AlkemioSessionPayload;
  alkemioCookieSession?: CookieSessionContext;
};

@Injectable()
export class CookieSessionStrategy extends PassportStrategy(
  Strategy,
  AUTH_STRATEGY_OIDC_COOKIE_SESSION
) {
  constructor(
    @Inject(SESSION_STORE_HANDLE)
    private readonly sessionStore: SessionStoreHandle
  ) {
    super();
  }

  async validate(req: Request): Promise<CookieSessionContext | null> {
    const sid = req.cookies?.[COOKIE_SESSION_NAME];
    if (typeof sid !== 'string' || sid.length === 0) return null;

    let payload: AlkemioSessionPayload | null;
    try {
      payload = await this.sessionStore.get(sid);
    } catch (err) {
      // FR-022b — surface store-unreachable distinctly so the filter can
      // emit 503 + Retry-After: 5 WITHOUT clearing the cookie.
      throw new SessionStoreUnavailableError(err);
    }

    if (!payload) return null;
    // FR-020a — payload is authoritative; reject as unauthenticated when
    // breached even if Redis still holds the key.
    if (isAbsoluteTtlExceeded(payload)) return null;

    const ctx: CookieSessionContext = {
      sub: payload.sub,
      alkemio_actor_id: payload.alkemio_actor_id ?? null,
      client_id: payload.client_id,
    };
    const r = req as RequestWithSession;
    r.alkemioSession = payload;
    r.alkemioCookieSession = ctx;
    return ctx;
  }
}
