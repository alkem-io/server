import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import {
  CORRELATION_ID_REQUEST_KEY,
  getCorrelationId,
} from '@core/middleware/correlation-id.middleware';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { RevokedBearerBlocklistService } from '@src/platform-admin/domain/service-clients/service-client-cache/revoked-bearer-blocklist.service';
import { ServiceClientCacheService } from '@src/platform-admin/domain/service-clients/service-client-cache/service-client-cache.service';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { type JWTVerifyGetKey, errors as joseErrors, jwtVerify } from 'jose';
import { Strategy } from 'passport-custom';
import { emitAudit } from '../audit';
import { isServiceClientAudienceAllowed } from '../bearer-aud-allow-list';
import { BearerValidationError } from './auth.errors';
import { AUTH_STRATEGY_OIDC_HYDRA_BEARER } from './strategy.names';

export const BEARER_JWKS_HANDLE = Symbol('OIDC_BEARER_JWKS_HANDLE');
export const BEARER_AUD_ALLOW_LIST_HANDLE = Symbol(
  'OIDC_BEARER_AUD_ALLOW_LIST_HANDLE'
);
export const HYDRA_ISSUER_URL_HANDLE = Symbol('OIDC_HYDRA_ISSUER_URL_HANDLE');

export type HydraBearerContext = {
  sub: string;
  alkemio_actor_id: string;
  client_id: string;
};

/**
 * 004 T032 — Service-principal request context, stashed on `req` for
 * resolvers. Distinct from `HydraBearerContext` (user-bearer); the
 * `kind` discriminator is the runtime tag resolvers branch on.
 */
export type ServicePrincipalContext = {
  kind: 'service-principal';
  clientId: string;
  name: string;
  grantedScopes: string[];
};

// FR-014 — client_id shape per spec (data-model §2 + research R-1). The
// service-principal branch only fires when `sub` matches this regex AND
// the cache resolves it to a row; an unrelated user UUID never matches.
const SERVICE_CLIENT_ID_RE = /^[a-z][a-z0-9-]{2,62}$/;

const BEARER_RE = /^Bearer\s+(\S+)$/i;

// FR-024 / FR-024a — verify Hydra-issued JWTs against JWKS, allow-listed
// audiences, AND require alkemio_actor_id presence. clockTolerance is 30s
// (jose default is 0; keep in sync with bearer-invalid.spec.ts T050 cases).
@Injectable()
export class HydraBearerStrategy extends PassportStrategy(
  Strategy,
  AUTH_STRATEGY_OIDC_HYDRA_BEARER
) {
  constructor(
    @Inject(BEARER_JWKS_HANDLE) private readonly jwks: JWTVerifyGetKey,
    @Inject(BEARER_AUD_ALLOW_LIST_HANDLE)
    private readonly audAllowList: string[],
    @Inject(HYDRA_ISSUER_URL_HANDLE) private readonly issuer: string,
    private readonly authService: AuthenticationService,
    private readonly actorContextService: ActorContextService,
    // 004 T032 — service-principal branch dependencies. @Optional() so the
    // strategy can boot even when 004 wiring is absent (unit tests, 003-only
    // environments); when undefined the branch is skipped entirely and the
    // strategy falls back to 003 behaviour exactly. TS optional (?) alone is
    // not enough — Nest DI ignores it without @Optional().
    @Optional()
    private readonly serviceClientCacheService?: ServiceClientCacheService,
    @Optional()
    private readonly revokedBearerBlocklistService?: RevokedBearerBlocklistService
  ) {
    super();
  }

  async validate(req: Request): Promise<ActorContext | null> {
    const auth = req.headers['authorization'];
    // FR-024b state-(a) — no Authorization header at all → anonymous fall-through.
    if (typeof auth !== 'string') return null;
    const correlationId = getCorrelationId(req) ?? randomUUID();
    const requestId = correlationId;
    // FR-024b state-(b) — Authorization header present but malformed → invalid.
    const m = BEARER_RE.exec(auth);
    if (!m) {
      emitAudit({
        event_type: 'auth.bearer.validation_failed',
        outcome: 'failure',
        correlation_id: correlationId,
        request_id: requestId,
        error_code: 'malformed_bearer_header',
      });
      throw new BearerValidationError('malformed_bearer_header', correlationId);
    }
    const token = m[1];

    // 004 T032 — Determine whether the bearer might be a service-principal
    // (sub matches the clientId shape, no `alkemio_actor_id` claim). When
    // yes, we relax the audience check at jose-time to allow the
    // service-client's own audience; resolution still requires a cache hit
    // with `status: enabled` AND that the aud matches the catalogue entry.
    let preFilteredPayload: Record<string, unknown> | null = null;
    try {
      const result = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        // Skip audience prefilter — we re-check below against the 003
        // allow-list OR the service-client cache. jose's audience option
        // is strict; we need broader admission here.
        clockTolerance: '30s',
      });
      preFilteredPayload = result.payload as Record<string, unknown>;
    } catch (err) {
      const errorCode = this.emitFailure(err, correlationId, requestId);
      throw new BearerValidationError(errorCode, correlationId, err);
    }

    const payload = preFilteredPayload;
    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const candidateAud = extractAud(payload.aud);

    // 004 T032 — Service-principal branch. Fires when:
    //   - the bearer has no `alkemio_actor_id` claim,
    //   - `sub` matches the catalogue clientId regex,
    //   - the cache resolves `sub` to an `enabled` row, AND
    //   - the cache-side audience equals `sub` (FR-017 invariant
    //     `audience = client_id`).
    const hasAlkemioActorId =
      typeof payload.alkemio_actor_id === 'string' &&
      payload.alkemio_actor_id.length > 0;

    if (
      !hasAlkemioActorId &&
      this.serviceClientCacheService !== undefined &&
      SERVICE_CLIENT_ID_RE.test(sub)
    ) {
      const cached = await this.serviceClientCacheService.lookup(sub);
      if (cached !== null) {
        // status check (FR-014 / FR-017): disabled rows never admit.
        if (cached.status !== 'enabled') {
          emitAudit({
            event_type: 'auth.bearer.service_client_disabled',
            outcome: 'failure',
            sub,
            client_id: sub,
            correlation_id: correlationId,
            request_id: requestId,
            error_code: 'service_client_disabled',
          });
          throw new BearerValidationError(
            'service_client_disabled',
            correlationId
          );
        }

        // FR-017 — audience MUST be on the allow-list. For service
        // principals the allow-list is the cache plus the static 003
        // list; for legacy callers the static list is the only source.
        if (
          candidateAud === null ||
          !isServiceClientAudienceAllowed(
            candidateAud,
            this.audAllowList,
            cached
          ) ||
          // Spec invariant: audience = client_id, exactly one per client.
          candidateAud !== sub
        ) {
          emitAudit({
            event_type: 'auth.bearer.invalid_audience',
            outcome: 'failure',
            sub,
            client_id: sub,
            correlation_id: correlationId,
            request_id: requestId,
            error_code: 'invalid_audience',
          });
          throw new BearerValidationError('invalid_audience', correlationId);
        }

        // FR-011a — single-bearer revoke blocklist. We check after the
        // status/aud gates so that the most-load-bearing rejection
        // reasons surface in audit before this finer-grained check.
        const jti = typeof payload.jti === 'string' ? payload.jti : '';
        if (
          jti.length > 0 &&
          this.revokedBearerBlocklistService !== undefined
        ) {
          const blocked =
            await this.revokedBearerBlocklistService.isBlocked(jti);
          if (blocked) {
            emitAudit({
              event_type: 'auth.bearer.token_revoked',
              outcome: 'failure',
              sub,
              client_id: sub,
              correlation_id: correlationId,
              request_id: requestId,
              error_code: 'token_revoked',
            });
            throw new BearerValidationError('token_revoked', correlationId);
          }
        }

        // FR-009 / FR-016 — granted = intersection(bearer.scope,
        // cache.configured). Bearer scope is OAuth2-space-separated.
        const bearerScopes = parseSpaceSeparatedScopes(payload.scope);
        const configured = new Set(cached.scopes);
        const grantedScopes = bearerScopes.filter(s => configured.has(s));

        const principal: ServicePrincipalContext = {
          kind: 'service-principal',
          clientId: sub,
          // Name lives in the catalogue row; the cache shape per
          // data-model §6 doesn't carry the display `name`, but
          // resolvers needing it can look it up post-admission. Stash
          // the clientId as the conservative default audit-friendly tag.
          name: sub,
          grantedScopes,
        };
        (
          req as Request & {
            servicePrincipal?: ServicePrincipalContext;
          }
        ).servicePrincipal = principal;

        if (!getCorrelationId(req)) {
          (req as Request & Record<string, unknown>)[
            CORRELATION_ID_REQUEST_KEY
          ] = correlationId;
        }

        // Service principals never resolve to an `ActorContext` (which
        // is the user-actor abstraction). Returning null here is the
        // anonymous-fall-through path per 003 — but resolvers read
        // `req.servicePrincipal` and gate independently of
        // `req.user`. NestJS-Passport's `validate` contract accepts
        // null + a side-channel principal on the request object.
        return null;
      }
      // Cache miss (catalogue has no such clientId): fall through to
      // the 003 envelope rejection below, NOT the cache-unavailable
      // path. A missing row at the catalogue is "not a known service
      // client" — treat the same as the legacy 003 reject.
    }

    // 003 unchanged: missing `alkemio_actor_id` ⇒ reject. Audience must
    // also be inside the legacy allow-list now that the jose check is
    // skipped above.
    if (candidateAud === null || !this.audAllowList.includes(candidateAud)) {
      emitAudit({
        event_type: 'auth.bearer.invalid_audience',
        outcome: 'failure',
        sub: sub.length > 0 ? sub : null,
        client_id: candidateAud,
        correlation_id: correlationId,
        request_id: requestId,
        error_code: 'invalid_audience',
      });
      throw new BearerValidationError('invalid_audience', correlationId);
    }

    if (!hasAlkemioActorId) {
      emitAudit({
        event_type: 'auth.bearer.missing_alkemio_claim',
        outcome: 'failure',
        sub: sub.length > 0 ? sub : null,
        client_id: candidateAud,
        correlation_id: correlationId,
        request_id: requestId,
        error_code: 'missing_alkemio_actor_id',
      });
      throw new BearerValidationError(
        'missing_alkemio_actor_id',
        correlationId
      );
    }

    const clientId = candidateAud ?? 'unknown';
    const actorId = payload.alkemio_actor_id as string;

    // Stash on request so resolvers can read uniform { sub, alkemio_actor_id,
    // client_id } regardless of which strategy validated.
    (req as Request & { alkemioBearer?: HydraBearerContext }).alkemioBearer = {
      sub,
      alkemio_actor_id: actorId,
      client_id: clientId,
    };
    // Fallback correlation id if upstream middleware did not run.
    if (!getCorrelationId(req)) {
      (req as Request & Record<string, unknown>)[CORRELATION_ID_REQUEST_KEY] =
        correlationId;
    }

    return this.authService.createActorContext(actorId);
  }

  // Emits the failure audit AND returns the resolved error_code so the caller
  // can attach it to BearerValidationError. Single source of truth for the
  // string mapping; interceptor mapper does NOT re-emit.
  private emitFailure(
    err: unknown,
    correlationId: string,
    requestId: string
  ): string {
    if (err instanceof joseErrors.JWTClaimValidationFailed) {
      // jose distinguishes audience/issuer/exp/etc via `claim` + `code`.
      const claim = (err as joseErrors.JWTClaimValidationFailed).claim;
      if (claim === 'aud') {
        emitAudit({
          event_type: 'auth.bearer.invalid_audience',
          outcome: 'failure',
          correlation_id: correlationId,
          request_id: requestId,
          error_code: 'invalid_audience',
        });
        return 'invalid_audience';
      }
      const code = claim ? `invalid_${claim}` : 'claim_validation_failed';
      emitAudit({
        event_type: 'auth.bearer.validation_failed',
        outcome: 'failure',
        correlation_id: correlationId,
        request_id: requestId,
        error_code: code,
      });
      return code;
    }
    if (err instanceof joseErrors.JWTExpired) {
      emitAudit({
        event_type: 'auth.bearer.validation_failed',
        outcome: 'failure',
        correlation_id: correlationId,
        request_id: requestId,
        error_code: 'token_expired',
      });
      return 'token_expired';
    }
    if (err instanceof joseErrors.JOSEError) {
      const code = (err as joseErrors.JOSEError).code ?? 'jose_error';
      emitAudit({
        event_type: 'auth.bearer.validation_failed',
        outcome: 'failure',
        correlation_id: correlationId,
        request_id: requestId,
        error_code: code,
      });
      return code;
    }
    emitAudit({
      event_type: 'auth.bearer.validation_failed',
      outcome: 'failure',
      correlation_id: correlationId,
      request_id: requestId,
      error_code: 'unknown_error',
    });
    return 'unknown_error';
  }
}

function extractAud(aud: unknown): string | null {
  if (typeof aud === 'string') return aud;
  if (Array.isArray(aud) && typeof aud[0] === 'string') return aud[0];
  return null;
}

// 004 T032 — bearer `scope` is OAuth2-space-separated per RFC 6749 §3.3.
// Empty / undefined / non-string ⇒ empty list (FR-016 "parked client"
// shape: empty configured set ⇒ FR-016 denies every operation).
function parseSpaceSeparatedScopes(raw: unknown): string[] {
  if (typeof raw !== 'string' || raw.length === 0) return [];
  return raw
    .split(/\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
