import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { AuthenticationService } from '@core/authentication/authentication.service';
import {
  CORRELATION_ID_REQUEST_KEY,
  getCorrelationId,
} from '@core/middleware/correlation-id.middleware';
import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { type JWTVerifyGetKey, errors as joseErrors, jwtVerify } from 'jose';
import { Strategy } from 'passport-custom';
import { emitAudit } from '../audit';
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
    private readonly actorContextService: ActorContextService
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
