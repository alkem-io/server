import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogContext } from '@src/common/enums';
import { AlkemioConfig } from '@src/types';
import { randomUUID } from 'crypto';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { emitAudit } from '../audit';
import { OidcService } from '../oidc.service';
import { OIDC_REDIS_CLIENT } from '../oidc.tokens';
import {
  listSessionsForSub,
  markSubRevoked,
  removeSessionFromSubIndex,
} from '../session-index.redis';
import type { SessionStoreHandle } from '../session-store.redis';
import { SESSION_STORE_HANDLE } from '../strategies/cookie-session.errors';
import type {
  RevokeAllForSubOptions,
  SessionRevocationEntry,
  SessionRevocationReason,
  SessionRevocationReport,
  TokenRevocationOutcome,
} from './session-revocation.types';

/**
 * FR-012a — the RFC 7009 call is bounded at 3 s, is NOT retried, and is NOT
 * behind a circuit breaker. Constitution principle 8 requires all three to be
 * stated for a new external integration, so, explicitly:
 *
 * - **Timeout 3 s** — this runs inside a user-facing mutation (`deleteUser`).
 * - **No retry** — the local teardown alone already delivers the access-control
 *   outcome (FR-013). A retry buys no additional guarantee and only lengthens a
 *   privileged mutation.
 * - **No circuit breaker** — deletion frequency is a handful per week; a
 *   breaker would spend its entire life in the closed state. The neighbouring
 *   Kratos calls on this same path are likewise single-attempt, so this matches
 *   local convention rather than inventing one.
 */
const TOKEN_REVOCATION_TIMEOUT_MS = 3000;

/**
 * How many sessions are torn down at once.
 *
 * The 3 s bound above governs ONE remote call; awaiting the sessions strictly
 * in turn multiplies it by the session count, so a subject with a dozen devices
 * could stall `deleteUser` for the better part of a minute whenever Hydra is
 * black-holed. Five keeps worst-case latency at ceil(N/5) x 3 s while leaving
 * Redis load flat — the loop is not the bottleneck, the remote leg is.
 */
const REVOCATION_CONCURRENCY = 5;

/**
 * Subject-scoped session revocation (server#6315).
 *
 * The primitive behind four call sites, only one of which exists today:
 * account deletion (this feature), password change (client-web#10070), the
 * admin email-change flow, and self-service session management (server#6073).
 * Its interface is fixed by
 * `specs/107-oidc-session-revocation/contracts/session-revocation-service.md`
 * so those three can consume it unchanged.
 *
 * Two properties are load-bearing and easy to break:
 *
 * 1. **Tombstone, never destroy.** `markTerminated` leaves a payload that
 *    `CookieSessionStrategy` rejects with a 401. `destroy` deletes the key,
 *    which the strategy reads as "never had a session" → anonymous
 *    fall-through → HTTP 200. That is the reported bug wearing a different hat:
 *    the browser keeps rendering as signed-in because nothing told it
 *    otherwise. The tombstone is also what discards the cached display name and
 *    email from the payload, so it is the GDPR Art. 17 half of the fix too.
 * 2. **Local certainty over remote completeness.** The Redis teardown completes
 *    before the authorization server is contacted, so a Hydra outage cannot
 *    leave a session alive.
 */
@Injectable()
export class OidcSessionRevocationService {
  private readonly webClientId: string;
  /**
   * Marker TTL: the absolute session ceiling. Past it, no session old enough to
   * be affected by the revocation can still exist, so the marker has nothing
   * left to reject.
   */
  private readonly sessionAbsoluteTtlS: number;

  constructor(
    @Inject(OIDC_REDIS_CLIENT) private readonly redis: Redis,
    @Inject(SESSION_STORE_HANDLE)
    private readonly sessionStore: SessionStoreHandle,
    private readonly oidcService: OidcService,
    configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.webClientId = configService.get(
      'identity.authentication.providers.oidc.web_client_id',
      { infer: true }
    );
    this.sessionAbsoluteTtlS = configService.get(
      'identity.authentication.providers.oidc.cookie',
      { infer: true }
    ).absolute_ttl_s;
  }

  /**
   * End every active session belonging to one subject.
   *
   * Resolves with a per-session report even when individual sessions fail
   * (FR-014) — partial failure is a result, not an exception. It rejects only
   * when the index itself cannot be read, which is the categorically different
   * "we do not know what to revoke" condition (contract C9). Every caller must
   * trap that; `deleteUser` does.
   *
   * @param sub the Kratos identity id, i.e. `user.authenticationID`. Nullable:
   *            users never linked to Kratos have none, and that is a legitimate
   *            state, not a fault (FR-017).
   */
  public async revokeAllForSub(
    sub: string | null | undefined,
    reason: SessionRevocationReason,
    opts?: RevokeAllForSubOptions
  ): Promise<SessionRevocationReport> {
    const correlationId = opts?.correlationId ?? randomUUID();

    // Contract C1 — no subject, nothing to do, and emphatically not an error.
    if (!sub) {
      return {
        sub: '',
        reason,
        correlationId,
        entries: [],
        revokedCount: 0,
        failedCount: 0,
        tokenRevocationFailedCount: 0,
        complete: true,
        subjectMarked: false,
      };
    }

    // Contract C2 — one read, one key. Never a keyspace scan.
    const sids = await listSessionsForSub(this.redis, sub);

    // FR-018 / trap 5 — audit BEFORE the side effects, so the evidence survives
    // a process death mid-teardown.
    emitAudit({
      event_type: 'session.revocation.initiated',
      outcome: 'success',
      sub,
      client_id: null,
      correlation_id: correlationId,
      request_id: correlationId,
      reason,
      truncated_input: String(sids.length),
    });

    // The subject-level marker, written BEFORE the per-session teardown.
    //
    // Order matters twice over. It closes the race described in
    // `session-index.redis.ts`: a request already in flight can overwrite a
    // tombstone with the live payload it loaded earlier, and once the sid has
    // been pruned from the index no retry can find it again. Writing the marker
    // first means that resurrected payload is still rejected on its next
    // request. It also covers sessions the index never knew about — the
    // pre-index population that the self-heal has not reached yet.
    //
    // NOT written for a scoped (`exceptSid`) revocation: the marker rejects by
    // subject, so it cannot distinguish the session that must survive. A
    // password change therefore relies on the index alone, which is correct for
    // it — that flow's sessions are all post-index by construction.
    const subjectMarked = opts?.exceptSid
      ? false
      : await this.markSubjectRevoked(sub, reason, correlationId);

    // Bounded concurrency, not a plain sequential await: see
    // REVOCATION_CONCURRENCY. Order within the report is preserved because each
    // batch is collected in slice order.
    const entries: SessionRevocationEntry[] = [];
    for (let i = 0; i < sids.length; i += REVOCATION_CONCURRENCY) {
      const batch = sids.slice(i, i + REVOCATION_CONCURRENCY);
      entries.push(
        ...(await Promise.all(
          batch.map(sid =>
            this.revokeOne(sid, sub, reason, correlationId, opts?.exceptSid)
          )
        ))
      );
    }

    // The three counters PARTITION the entries — no entry is counted twice.
    // `failedCount` therefore means exactly "sessions that may still be alive",
    // which is what an auditor reads it as.
    const revokedCount = entries.filter(e => e.outcome === 'revoked').length;
    const failedCount = entries.filter(e => e.outcome === 'failed').length;
    const tokenRevocationFailedCount = entries.filter(
      e => e.tokenRevocation === 'failed'
    ).length;
    const complete = failedCount === 0 && tokenRevocationFailedCount === 0;

    emitAudit({
      event_type: 'session.revocation.completed',
      outcome: complete ? 'success' : 'failure',
      sub,
      client_id: null,
      correlation_id: correlationId,
      request_id: correlationId,
      reason,
      truncated_input: `revoked=${revokedCount} failed=${failedCount} token_revocation_failed=${tokenRevocationFailedCount} subject_marked=${subjectMarked} total=${entries.length}`,
    });

    return {
      sub,
      reason,
      correlationId,
      entries,
      revokedCount,
      failedCount,
      tokenRevocationFailedCount,
      complete,
      subjectMarked,
    };
  }

  /**
   * Write the subject-level revocation marker. Best-effort with respect to the
   * caller — a marker failure must not abort the per-session teardown, which is
   * the leg that actually ends access for every indexed session — but never
   * silent: the failure is logged and surfaced in the report as
   * `subjectMarked: false`.
   */
  private async markSubjectRevoked(
    sub: string,
    reason: SessionRevocationReason,
    correlationId: string
  ): Promise<boolean> {
    try {
      await markSubRevoked(
        this.redis,
        sub,
        Math.floor(Date.now() / 1000),
        this.sessionAbsoluteTtlS
      );
      return true;
    } catch (error) {
      this.logger.error?.(
        {
          message:
            'Failed to write the subject revocation marker; per-session teardown continues',
          sub,
          reason,
          correlationId,
          failureReason: redactError(error),
        },
        redactStack(error),
        LogContext.AUTH
      );
      return false;
    }
  }

  private async revokeOne(
    sid: string,
    sub: string,
    reason: SessionRevocationReason,
    correlationId: string,
    exceptSid?: string
  ): Promise<SessionRevocationEntry> {
    // Contract C7 — the excepted session is left entirely alone, index
    // membership included: a later `scope=others` call must still see it.
    if (exceptSid && sid === exceptSid) {
      return this.recordEntry(
        { sid, outcome: 'skipped_excepted', tokenRevocation: 'skipped' },
        sub,
        null,
        reason,
        correlationId
      );
    }

    let clientId: string | null = null;
    // Everything this session holds that must never reach a log or an audit
    // record. Collected as the payload is read so the catch block below can
    // scrub it out of any upstream error text or stack trace, no matter what
    // the failing library chose to embed in its message.
    const secrets: string[] = [];
    try {
      // Capture BEFORE mutating: the tombstone blanks every token field and
      // nulls the cached PII, so this is the only chance to read the refresh
      // token we are about to revoke upstream.
      const payload = await this.sessionStore.get(sid);
      clientId = payload?.client_id || null;
      if (payload) {
        secrets.push(
          payload.access_token,
          payload.id_token,
          payload.refresh_token,
          payload.request_context_cache?.display_name ?? '',
          payload.request_context_cache?.email ?? ''
        );
      }

      if (!payload) {
        // Contract C5 — the index is advisory (invariant I3). A member naming a
        // sid whose payload has expired or been signed out is normal. No
        // tombstone: there is nothing left to tombstone, and writing one would
        // resurrect a 401 for a session that had already ended cleanly.
        await this.pruneQuietly(sub, sid);
        return this.recordEntry(
          { sid, outcome: 'already_absent', tokenRevocation: 'skipped' },
          sub,
          clientId,
          reason,
          correlationId
        );
      }

      if (payload.terminated_at) {
        // FR-015 — idempotent. Deletion may be retried.
        await this.pruneQuietly(sub, sid);
        return this.recordEntry(
          { sid, outcome: 'already_terminated', tokenRevocation: 'skipped' },
          sub,
          clientId,
          reason,
          correlationId
        );
      }

      const refreshToken = payload.refresh_token || '';

      // Tombstone, NOT destroy. See the class comment — this one line is the
      // difference between fixing the bug and reproducing it.
      //
      // FR-009a — the resulting refusal is time-bounded, not permanent: the
      // tombstone carries SESSION_TOMBSTONE_TTL_S (300 s, `session-store.redis.ts`).
      // Once it lapses the session resolves as an ordinary anonymous visitor,
      // which is the correct end state — the requirement is that the session
      // never again *authenticates*, not that it refuses forever. A permanent
      // tombstone would grow the session store without bound for no security
      // gain. Satisfied by construction here; nothing to add.
      await this.sessionStore.markTerminated(sid, reason, {
        sub,
        client_id: payload.client_id,
      });

      // ── The tombstone landed. Access to this session has ENDED. ───────────
      // Everything below is bookkeeping, and none of it may downgrade the
      // outcome. Pruning through `pruneQuietly` rather than calling
      // `removeSessionFromSubIndex` directly is what keeps a Redis blip during
      // the SREM from reporting a session as `failed` — i.e. as still alive —
      // when it is provably 401'ing. The compliance evidence has to distinguish
      // "access not removed" from "index tidy-up did not finish".
      //
      // FR-011 note: there is deliberately no `DEL` of the refresh lock here.
      // The refresh mutex in production is the in-process `refreshInFlight`
      // Map, so the Redis lock key is never written and deleting it is a no-op
      // round trip. Worse, `releaseRefreshLock` is an owner-checked
      // compare-and-delete precisely so a lock cannot be stolen; an
      // unconditional `DEL` here would defeat that the moment the Redis mutex
      // is wired up, letting two refreshes rotate the same grant at once.
      await this.pruneQuietly(sub, sid);

      // FR-013 — the local teardown above has already landed, so whatever
      // happens here the session is dead on this platform.
      const tokenRevocation = await this.revokeRefreshTokenAtIssuer(
        refreshToken,
        secrets
      );

      return this.recordEntry(
        {
          sid,
          outcome: 'revoked',
          tokenRevocation,
          ...(tokenRevocation === 'failed'
            ? { failureReason: 'token_revocation_failed' }
            : {}),
        },
        sub,
        clientId,
        reason,
        correlationId
      );
    } catch (error) {
      // FR-022 — never swallowed. Audited as a failure below, and logged here.
      const failureReason = redactError(error, secrets);
      this.logger.error?.(
        {
          message: 'Session revocation failed for one session',
          sid,
          sub,
          reason,
          correlationId,
          failureReason,
        },
        // The stack embeds the original message verbatim, so it needs the same
        // scrubbing as the message itself — passing `error.stack` raw is how
        // token material reaches the log even when the message was redacted.
        redactStack(error, secrets),
        LogContext.AUTH
      );
      return this.recordEntry(
        { sid, outcome: 'failed', tokenRevocation: 'skipped', failureReason },
        sub,
        clientId,
        reason,
        correlationId
      );
    }
  }

  /**
   * Index pruning is best-effort at every call site (FR-006). A failure here
   * leaves a stale member that a later revocation resolves as `already_absent`;
   * it must never turn a successful teardown into a reported failure.
   */
  private async pruneQuietly(sub: string, sid: string): Promise<void> {
    try {
      await removeSessionFromSubIndex(this.redis, sub, sid);
    } catch (error) {
      this.logger.warn?.(
        {
          message: 'Failed to prune session from subject index',
          sid,
          sub,
          failureReason: redactError(error),
        },
        LogContext.AUTH
      );
    }
  }

  /**
   * FR-019 — one audit record per session. Emitting from a single helper is
   * what guarantees no early-return path can skip it.
   */
  private recordEntry(
    entry: SessionRevocationEntry,
    sub: string,
    clientId: string | null,
    reason: SessionRevocationReason,
    correlationId: string
  ): SessionRevocationEntry {
    const failed =
      entry.outcome === 'failed' || entry.tokenRevocation === 'failed';
    emitAudit({
      event_type: 'session.revoked',
      outcome: failed ? 'failure' : 'success',
      sub,
      client_id: clientId,
      correlation_id: correlationId,
      request_id: correlationId,
      reason,
      // Never token material (FR-021): either an outcome name or an already
      // redacted cause.
      error_code: entry.failureReason ?? entry.outcome,
    });
    return entry;
  }

  /**
   * RFC 7009 token revocation against the issuer's advertised
   * `revocation_endpoint`.
   *
   * The endpoint is resolved from the same discovery metadata the logout leg
   * already reads for `end_session_endpoint`, so there is one discovery source
   * and no new configuration key. The RP is a public client
   * (`token_endpoint_auth_method: 'none'`), so RFC 7009 §2.1 client
   * authentication is the `client_id` form parameter — no secret is involved,
   * which is also why nothing here can leak a credential into a log.
   *
   * Never throws: every failure mode collapses to `'failed'` so the caller's
   * local teardown stands (FR-013).
   */
  private async revokeRefreshTokenAtIssuer(
    refreshToken: string,
    secrets: string[]
  ): Promise<TokenRevocationOutcome> {
    if (!refreshToken) return 'skipped';

    let revocationEndpoint: string | undefined;
    try {
      // Throws while discovery is still in flight — the identity chain may not
      // be reachable yet. That is a failure of the remote leg, not of the
      // revocation.
      const metadata = this.oidcService.getIssuer().metadata as {
        revocation_endpoint?: string;
      };
      revocationEndpoint = metadata.revocation_endpoint;
    } catch {
      revocationEndpoint = undefined;
    }

    if (!revocationEndpoint) {
      this.logger.warn?.(
        {
          message:
            'Skipping RFC 7009 refresh-token revocation: no revocation_endpoint available',
        },
        LogContext.AUTH
      );
      // `skipped`, not `failed`. Nothing was attempted, so nothing failed —
      // and the distinction is not pedantry. `initDiscovery` is fire-and-forget
      // with an indefinite retry, so an unreachable Hydra at boot leaves this
      // endpoint unresolved for a while; in dev, CI and restart waves that is
      // routine. Reporting it as a failure would mark every revocation
      // incomplete and audit a teardown that fully succeeded locally as
      // `outcome=failure`. Evidence that cries wolf is worse than none, because
      // the auditor can no longer pick out the real failures.
      return 'skipped';
    }

    try {
      const response = await fetch(revocationEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          token: refreshToken,
          token_type_hint: 'refresh_token',
          client_id: this.webClientId,
        }).toString(),
        signal: AbortSignal.timeout(TOKEN_REVOCATION_TIMEOUT_MS),
      });
      if (!response.ok) {
        this.logger.warn?.(
          {
            message: 'RFC 7009 refresh-token revocation returned non-2xx',
            status: response.status,
          },
          LogContext.AUTH
        );
        return 'failed';
      }
      return 'revoked';
    } catch (error) {
      this.logger.warn?.(
        {
          message: 'RFC 7009 refresh-token revocation call failed',
          // The token was literally in the request body, so a client that
          // echoes the request into its error message would otherwise put it
          // straight into the log.
          failureReason: redactError(error, secrets),
        },
        LogContext.AUTH
      );
      return 'failed';
    }
  }
}

/**
 * FR-021 / SC-006 — no token material and no cached PII may reach an audit
 * record or a log line.
 *
 * Two layers, because either alone is insufficient:
 *
 * 1. **Known-value scrubbing.** `secrets` carries the exact values this session
 *    held. An upstream client is free to embed the request body in its error
 *    message in any shape it likes (`"revocation failed for token <value>"` is
 *    a real example), and no pattern can be relied on to catch every shape.
 *    Removing the literal values we hold is exact rather than heuristic.
 * 2. **Pattern scrubbing.** A backstop for token-shaped material we did *not*
 *    supply — an upstream token, a nested JWT — plus truncation so a huge
 *    response body cannot be dumped into a log.
 */
export function redactError(error: unknown, secrets: string[] = []): string {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'unknown_error';
  return scrub(raw, secrets).slice(0, 200);
}

/**
 * An `Error`'s stack begins with its message, so logging `error.stack`
 * unredacted defeats a redacted `message` entirely. Same scrubbing, longer
 * budget because a stack is legitimately multi-line and useful.
 */
export function redactStack(
  error: unknown,
  secrets: string[] = []
): string | undefined {
  if (!(error instanceof Error) || !error.stack) return undefined;
  return scrub(error.stack, secrets).slice(0, 4000);
}

/**
 * Below this length a value is too generic to search-and-replace safely: a
 * 3-character string occurs inside ordinary words, so scrubbing it would
 * shred the surrounding message. The floor is 4, not 8 — `secrets` carries a
 * cached display name as well as tokens, and short real names ("Bo", "Ana")
 * were sailing straight through an 8-character gate. Names that short are
 * accepted as unscrubbable; the two backstop patterns never matched a personal
 * name anyway, so the gate was the whole defence for them.
 */
const MIN_SCRUBBABLE_SECRET_LENGTH = 4;

function scrub(input: string, secrets: string[]): string {
  let out = input;
  for (const secret of secrets) {
    if (!secret || secret.length < MIN_SCRUBBABLE_SECRET_LENGTH) continue;
    out = out.split(secret).join('***');
  }
  return (
    out
      // `token=…`, `refresh_token: …`, `access_token=…` and friends.
      .replace(/((?:access|refresh|id)?_?token)["'\s]*[=:]\s*\S+/gi, '$1=***')
      // Bare JWT-shaped material.
      .replace(/\beyJ[\w-]*\.[\w-]*\.?[\w-]*/g, '***')
  );
}
