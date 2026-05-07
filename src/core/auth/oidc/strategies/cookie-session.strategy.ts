import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { getCorrelationId } from '@core/middleware/correlation-id.middleware';
import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { Strategy } from 'passport-custom';
import { isAbsoluteTtlExceeded } from '../absolute-ttl.guard';
import { emitAudit } from '../audit';
import type {
  AlkemioSessionPayload,
  SessionStoreHandle,
} from '../session-store.redis';
import { CookieSessionInvalidError } from './auth.errors';
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
    private readonly sessionStore: SessionStoreHandle,
    private readonly authService: AuthenticationService,
    private readonly actorContextService: ActorContextService
  ) {
    super();
  }

  async validate(req: Request): Promise<ActorContext | null> {
    // express-session has already parsed and signature-verified the cookie by
    // the time this strategy runs; `req.sessionID` is the bare sid that
    // matches the Redis key suffix. Reading `req.cookies[name]` directly
    // would yield the signed wire value (`s:<sid>.<sig>`) which never
    // matches a Redis key and silently degrades every request to anonymous.
    const sid =
      typeof req.sessionID === 'string' && req.sessionID.length > 0
        ? req.sessionID
        : req.cookies?.[COOKIE_SESSION_NAME];
    if (typeof sid !== 'string' || sid.length === 0) return null;

    let payload: AlkemioSessionPayload | null;
    try {
      payload = await this.sessionStore.get(sid);
    } catch (err) {
      // FR-022b — surface store-unreachable distinctly so the filter can
      // emit 503 + Retry-After: 5 WITHOUT clearing the cookie.
      throw new SessionStoreUnavailableError(err);
    }

    // FR-024b state-(a) — cookie present but no Redis key (never-existed,
    // reaped by 14-day TTL backstop, OR fully `destroy()`d by logout). Return
    // null so the interceptor surfaces anonymous, NOT 401.
    if (!payload) return null;

    const correlationId = getCorrelationId(req) ?? randomUUID();
    const requestId = correlationId;

    // FR-022c state-(b) — payload is a tombstone left behind by refresh
    // teardown. Distinguishes "had-a-session-now-invalid" from
    // "never-existed". Throw → 401 UNAUTHENTICATED (not anonymous fall-through).
    if (payload.terminated_at) {
      const reason = payload.terminated_reason ?? 'refresh_teardown';
      emitAudit({
        event_type: 'auth.cookie.session_terminated',
        outcome: 'failure',
        sub: payload.sub || null,
        client_id: payload.client_id || null,
        correlation_id: correlationId,
        request_id: requestId,
        error_code: reason,
      });
      throw new CookieSessionInvalidError(reason, correlationId);
    }

    // FR-020a state-(b) — absolute 14-day ceiling breached. Authoritative
    // even if Redis still holds the key.
    if (isAbsoluteTtlExceeded(payload)) {
      emitAudit({
        event_type: 'auth.cookie.absolute_ttl_exceeded',
        outcome: 'failure',
        sub: payload.sub || null,
        client_id: payload.client_id || null,
        correlation_id: correlationId,
        request_id: requestId,
        error_code: 'absolute_ttl_exceeded',
      });
      throw new CookieSessionInvalidError(
        'absolute_ttl_exceeded',
        correlationId
      );
    }

    const ctx: CookieSessionContext = {
      sub: payload.sub,
      alkemio_actor_id: payload.alkemio_actor_id ?? null,
      client_id: payload.client_id,
    };
    const r = req as RequestWithSession;
    r.alkemioSession = payload;
    r.alkemioCookieSession = ctx;

    // Build full ActorContext so downstream auth (GraphqlGuard,
    // AuthorizationService) sees a `.credentials` array. Without
    // alkemio_actor_id we cannot resolve credentials → anonymous.
    if (!payload.alkemio_actor_id) {
      return this.actorContextService.createAnonymous();
    }
    return this.authService.createActorContext(payload.alkemio_actor_id);
  }
}
