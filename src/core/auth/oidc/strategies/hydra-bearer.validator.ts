import { ActorContext } from '@core/actor-context/actor.context';
import { AuthenticationService } from '@core/authentication/authentication.service';
import { Inject, Injectable } from '@nestjs/common';
import { type JWTVerifyGetKey, errors as joseErrors, jwtVerify } from 'jose';
import { emitAudit } from '../audit';
import { BearerValidationError } from './auth.errors';

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

export type HydraBearerValidationResult = {
  actorContext: ActorContext;
  ctx: HydraBearerContext;
};

const BEARER_RE = /^Bearer\s+(\S+)$/i;

/**
 * Shared Hydra-bearer validation. Used by both `HydraBearerStrategy`
 * (passport — bubbles BearerValidationError → 401) and `ResolveController`
 * (forwardAuth — catches errors → anonymous fall-through, never 401).
 *
 * Behaviour mirrors the original strategy.validate body 1:1: jose JWKS sig
 * check + issuer + audience allow-list + alkemio_actor_id presence + 30s
 * clock tolerance. Side-effects (request stashing, correlation id) live in
 * callers, not here.
 */
@Injectable()
export class HydraBearerValidator {
  constructor(
    @Inject(BEARER_JWKS_HANDLE) private readonly jwks: JWTVerifyGetKey,
    @Inject(BEARER_AUD_ALLOW_LIST_HANDLE)
    private readonly audAllowList: string[],
    @Inject(HYDRA_ISSUER_URL_HANDLE) private readonly issuer: string,
    private readonly authService: AuthenticationService
  ) {}

  /**
   * Validate an Authorization header value.
   *
   * - Header MUST be present and match `Bearer <token>`. (Callers handle absence.)
   * - Throws `BearerValidationError` on malformed / sig fail / expired / wrong
   *   issuer / wrong audience / missing alkemio_actor_id.
   * - Returns the resolved ActorContext + parsed claims on success.
   */
  async validateAuthorizationHeader(
    authorization: string,
    correlationId: string,
    requestId: string
  ): Promise<HydraBearerValidationResult> {
    const m = BEARER_RE.exec(authorization);
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

    let payload: Record<string, unknown>;
    try {
      const result = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audAllowList,
        clockTolerance: '30s',
      });
      payload = result.payload as Record<string, unknown>;
    } catch (err) {
      const errorCode = this.emitFailure(err, correlationId, requestId);
      throw new BearerValidationError(errorCode, correlationId, err);
    }

    if (
      typeof payload.alkemio_actor_id !== 'string' ||
      payload.alkemio_actor_id.length === 0
    ) {
      emitAudit({
        event_type: 'auth.bearer.missing_alkemio_claim',
        outcome: 'failure',
        sub: typeof payload.sub === 'string' ? payload.sub : null,
        client_id: extractAud(payload.aud),
        correlation_id: correlationId,
        request_id: requestId,
        error_code: 'missing_alkemio_actor_id',
      });
      throw new BearerValidationError(
        'missing_alkemio_actor_id',
        correlationId
      );
    }

    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const clientId = extractAud(payload.aud) ?? 'unknown';
    const actorId = payload.alkemio_actor_id;

    const actorContext = await this.authService.createActorContext(actorId);
    return {
      actorContext,
      ctx: { sub, alkemio_actor_id: actorId, client_id: clientId },
    };
  }

  // Audit + map jose error → stable error code. Single source of truth for the
  // string mapping; consumers should NOT re-emit on BearerValidationError catch.
  private emitFailure(
    err: unknown,
    correlationId: string,
    requestId: string
  ): string {
    if (err instanceof joseErrors.JWTClaimValidationFailed) {
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
