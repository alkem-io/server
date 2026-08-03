import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { getCorrelationId } from '@core/middleware/correlation-id.middleware';
import { Inject, Injectable, LoggerService, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { LogContext } from '@src/common/enums';
import { AlkemioConfig } from '@src/types';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Strategy } from 'passport-custom';
import { isAbsoluteTtlExceeded } from '../absolute-ttl.guard';
import { emitAudit } from '../audit';
import { OIDC_REDIS_CLIENT } from '../oidc.tokens';
import {
  addSessionToSubIndex,
  getSubRevokedAt,
  removeSessionFromSubIndex,
} from '../session-index.redis';
import type {
  AlkemioSessionPayload,
  SessionStoreHandle,
} from '../session-store.redis';
import { CookieSessionInvalidError } from './auth.errors';
import {
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
  /**
   * Per-env session cookie name resolved from `oidc.cookie.name`. Only used
   * by the rare `req.sessionID`-missing fallback path below; the primary
   * path uses the sid express-session already parsed for us.
   */
  private readonly sessionCookieName: string;

  constructor(
    @Inject(SESSION_STORE_HANDLE)
    private readonly sessionStore: SessionStoreHandle,
    private readonly authService: AuthenticationService,
    private readonly actorContextService: ActorContextService,
    configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    // server#6315 — the subject revocation marker read and the self-healing
    // index write. Optional so test harnesses that construct this strategy
    // directly keep working; when absent both are skipped and nothing else
    // changes.
    @Optional()
    @Inject(OIDC_REDIS_CLIENT)
    private readonly redis?: Redis
  ) {
    super();
    this.sessionCookieName = configService.get(
      'identity.authentication.providers.oidc.cookie.name',
      { infer: true }
    );
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
        : req.cookies?.[this.sessionCookieName];
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

    // server#6315 — subject-level revocation marker.
    //
    // The per-session tombstone above is necessary but not sufficient: it lives
    // in a key express-session also writes, so an in-flight request can put the
    // live payload back over it, and it only exists for sessions the index knew
    // about in the first place. This check is keyed by subject and so survives
    // both. See `session-index.redis.ts` for the full argument.
    //
    // Costs one awaited Redis GET on the authenticated request path — stated
    // plainly rather than dressed up as free, because it IS on the critical
    // path (unlike the fire-and-forget self-heal below). A revocation check has
    // to be synchronous to be a control at all.
    const revokedAt = await this.readSubRevokedAt(payload.sub, correlationId);
    if (revokedAt !== null && revokedAt >= payload.created_at) {
      emitAudit({
        event_type: 'auth.cookie.subject_revoked',
        outcome: 'failure',
        sub: payload.sub || null,
        client_id: payload.client_id || null,
        correlation_id: correlationId,
        request_id: requestId,
        error_code: 'subject_revoked',
      });
      // server#6315 — retire the payload the marker just condemned.
      //
      // Unlike a tombstone, this payload is untouched and healthy: the marker
      // rejects it by subject, so the record itself carries no evidence it is
      // dead and keeps its ordinary TTL — up to the full 14-day idle window.
      // Left in place it would be re-read, re-audited and re-rejected on every
      // request for a fortnight, and because the rejection is global it also
      // blocks `/api/auth/oidc/login`, so the holder cannot sign in again.
      // Destroying it makes this the LAST request that pays the check: the next
      // one finds no payload and resolves as an ordinary anonymous visitor.
      //
      // No tombstone is written in its place. A tombstone is how a session that
      // was alive announces it has ended; this one has already been announced
      // by the marker, and re-terminating it would only reinstate the same
      // 401-everything state for another 5 minutes.
      //
      // Best-effort: a failure here must not turn the 401 into a 500, so the
      // rejection below stands either way. Never awaited into the outcome.
      await this.retireRevokedSession(sid, payload.sub, correlationId);
      throw new CookieSessionInvalidError('subject_revoked', correlationId);
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

    // server#6315 / FR-002a — self-healing index write. Sessions minted before
    // the per-subject index shipped are absent from it and therefore
    // unrevocable; that is precisely the population carrying the #6315 bug.
    // Registering the session here makes it revocable from its holder's very
    // next request, with no migration and no keyspace scan.
    //
    // Placement is load-bearing: this sits AFTER the tombstone and absolute-TTL
    // branches above, so a dead session is never re-indexed (keyspace invariant
    // I5). Re-indexing a tombstone would resurrect a dead sid into the listing
    // on every request from a stale tab.
    //
    // Deliberately NOT awaited: the request must not pay for index maintenance
    // (SC-011b) and must not fail if Redis hiccups (FR-006). It is unawaited,
    // not unobserved — the catch logs, because a silent failure path is
    // forbidden outright by the engineering constitution.
    this.reindexSession(sid, payload);

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
    const actorContext = await this.authService.createActorContext(
      payload.alkemio_actor_id
    );
    // Stamp session lifetime onto a REQUEST-SCOPED COPY. createActorContext
    // returns the actorID-keyed cached instance, shared across all of this
    // actor's sessions and concurrent requests — writing per-session values
    // onto it would let sessions overwrite each other.
    // Payload times are epoch-seconds; ActorContext uses milliseconds.
    // expiry = access-token expiry (self-renews — informational);
    // absoluteExpiry = the 30d ceiling that never extends (enforcement);
    // the sliding idle window renews on activity and cannot be stamped.
    return Object.assign(new ActorContext(), actorContext, {
      expiry: payload.expires_at * 1000,
      absoluteExpiry: payload.absolute_expires_at * 1000,
      issuedAt: payload.created_at * 1000,
    });
  }

  /**
   * Read the subject revocation marker.
   *
   * **Fails open**, deliberately, and this is the one judgement call in the
   * check. A hard Redis outage never reaches here — `sessionStore.get` above
   * would already have thrown `SessionStoreUnavailableError` → 503 — so a
   * rejection at this point means Redis is up and this single command failed:
   * rare and transient. Failing closed would sign out every user on the
   * platform for the duration of such a blip, to defend a window the tombstone
   * already covers for every indexed session. The failure is logged, never
   * swallowed.
   */
  private async readSubRevokedAt(
    sub: string,
    correlationId: string
  ): Promise<number | null> {
    if (!this.redis || !sub) return null;
    try {
      return await getSubRevokedAt(this.redis, sub);
    } catch (error) {
      this.logger.warn?.(
        {
          message:
            'Failed to read the subject revocation marker; allowing the request',
          sub,
          correlationId,
          failureReason: error instanceof Error ? error.message : String(error),
        },
        LogContext.AUTH
      );
      return null;
    }
  }

  /**
   * server#6315 — drop a session the subject-revocation marker has condemned,
   * plus its index membership.
   *
   * Awaited, unlike the self-heal below, and the difference is deliberate: this
   * runs at most once per session (the whole point is that the next request
   * finds nothing) whereas the self-heal runs on every authenticated request.
   * Awaiting also keeps the ordering honest — the 401 this request returns is
   * then guaranteed to be the last one that session can produce.
   *
   * Every failure mode is swallowed after logging. The request is being
   * rejected either way; a Redis hiccup during cleanup must not escalate a
   * deliberate 401 into a 500, which would take out `/login` just as thoroughly
   * as the state this method exists to clear.
   */
  private async retireRevokedSession(
    sid: string,
    sub: string,
    correlationId: string
  ): Promise<void> {
    try {
      await this.sessionStore.destroy(sid);
    } catch (error) {
      this.logger.warn?.(
        {
          message:
            'Failed to destroy a subject-revoked session; it will be rejected again on the next request',
          sid,
          sub,
          correlationId,
          failureReason: error instanceof Error ? error.message : String(error),
        },
        LogContext.AUTH
      );
    }
    if (!this.redis || !sub) return;
    try {
      await removeSessionFromSubIndex(this.redis, sub, sid);
    } catch (error) {
      this.logger.warn?.(
        {
          message:
            'Failed to prune a subject-revoked session from the subject index',
          sid,
          sub,
          correlationId,
          failureReason: error instanceof Error ? error.message : String(error),
        },
        LogContext.AUTH
      );
    }
  }

  /**
   * server#6315 / FR-002a — fire-and-forget membership top-up for the
   * per-subject session index.
   *
   * One Redis round trip (an `EVAL` doing `SADD` plus a conditional TTL roll),
   * issued for every authenticated request so that sessions predating the index
   * become revocable from their holder's next request. Returns `void` rather
   * than a promise on purpose, so a caller cannot accidentally start awaiting
   * it and put Redis on the request's critical path.
   */
  private reindexSession(sid: string, payload: AlkemioSessionPayload): void {
    if (!this.redis || !payload.sub) return;
    void addSessionToSubIndex(
      this.redis,
      payload.sub,
      sid,
      payload.absolute_expires_at
    ).catch(error => {
      // Unawaited, but never unobserved — silent failure paths are forbidden.
      this.logger.warn?.(
        {
          message: 'Failed to self-heal subject session index',
          sub: payload.sub,
          sid,
          failureReason: error instanceof Error ? error.message : String(error),
        },
        LogContext.AUTH
      );
    });
  }
}
