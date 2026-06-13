import { ActorContext } from '@core/actor-context/actor.context';
import { AUTH_STRATEGY_NON_INTERACTIVE_LOGIN } from '@core/auth/oidc/strategies/strategy.names';
import { AuthenticationService } from '@core/authentication/authentication.service';
import {
  CORRELATION_ID_REQUEST_KEY,
  getCorrelationId,
} from '@core/middleware/correlation-id.middleware';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { errors as joseErrors, jwtVerify } from 'jose';
import { Strategy } from 'passport-custom';
import { NonInteractiveLoginAuditService } from './non-interactive-login.audit';
import { NonInteractiveLoginConfig } from './non-interactive-login.config';
import { NON_INTERACTIVE_LOGIN_ISSUER } from './non-interactive-login.types';

const BEARER_RE = /^Bearer\s+(\S+)$/i;

/**
 * Non-interactive-login bearer strategy. Verifies HS256 JWTs signed by this
 * server's own `NON_INTERACTIVE_LOGIN_SIGNING_KEY`. Inert when
 * `NonInteractiveLoginConfig.enabled === false` (returns null fast, lets
 * passport fall through to the next strategy).
 *
 * Distinct from `HydraBearerStrategy` on three independent axes:
 *   - Signing alg: HS256 (Hydra-issued tokens are RS256 → fail verify here)
 *   - Issuer claim: `alkemio-non-interactive-login` (Hydra tokens fail issuer check here)
 *   - Marker claim: `non_interactive_login === true` required
 *
 * On invalid HS256 bearer (bad sig / expired / missing marker), this returns
 * null rather than throwing — so a malformed non-interactive-login token must
 * not 401 a request that would otherwise succeed via a different strategy.
 * Bad-signature audit is still emitted for visibility.
 */
@Injectable()
export class NonInteractiveLoginStrategy extends PassportStrategy(
  Strategy,
  AUTH_STRATEGY_NON_INTERACTIVE_LOGIN
) {
  constructor(
    private readonly config: NonInteractiveLoginConfig,
    private readonly authService: AuthenticationService,
    private readonly audit: NonInteractiveLoginAuditService
  ) {
    super();
  }

  async validate(req: Request): Promise<ActorContext | null> {
    // Gate 1: bypass disabled → never accept any token.
    if (!this.config.enabled || !this.config.secretKey) return null;

    const auth = req.headers['authorization'];
    if (typeof auth !== 'string') return null;
    const match = BEARER_RE.exec(auth);
    if (!match) return null;
    const token = match[1];

    // Cheap pre-check: decode header without verify. If alg isn't HS256 or
    // issuer isn't ours, fall through to the next strategy. Skips audit noise
    // for every regular Hydra-bearer request.
    if (!NonInteractiveLoginStrategy.looksLikeHs256Token(token)) return null;

    const correlationId = getCorrelationId(req) ?? randomUUID();

    let payload: Record<string, unknown>;
    try {
      const result = await jwtVerify(token, this.config.secretKey, {
        issuer: NON_INTERACTIVE_LOGIN_ISSUER,
        clockTolerance: '30s',
      });
      payload = result.payload as Record<string, unknown>;
    } catch (err) {
      const errorCode =
        err instanceof joseErrors.JWTExpired
          ? 'token_expired'
          : err instanceof joseErrors.JWTClaimValidationFailed
            ? `invalid_${(err as joseErrors.JWTClaimValidationFailed).claim ?? 'claim'}`
            : err instanceof joseErrors.JWSSignatureVerificationFailed
              ? 'invalid_signature'
              : 'jose_error';
      this.audit.emit({
        event_type: 'non_interactive_login.bearer_rejected',
        outcome: 'failure',
        correlation_id: correlationId,
        error_code: errorCode,
      });
      // Tertiary strategy: a malformed non-interactive-login token must not
      // 401 the request — return null so passport tries the next (none after
      // this), then the global interceptor falls back to anonymous.
      return null;
    }

    if (payload.non_interactive_login !== true) {
      this.audit.emit({
        event_type: 'non_interactive_login.bearer_rejected',
        outcome: 'failure',
        correlation_id: correlationId,
        error_code: 'missing_non_interactive_login_marker',
      });
      return null;
    }
    const actorId = payload.alkemio_actor_id;
    if (typeof actorId !== 'string' || actorId.length === 0) {
      this.audit.emit({
        event_type: 'non_interactive_login.bearer_rejected',
        outcome: 'failure',
        correlation_id: correlationId,
        error_code: 'missing_alkemio_actor_id',
      });
      return null;
    }

    this.audit.emit({
      event_type: 'non_interactive_login.bearer_accepted',
      outcome: 'success',
      sub: typeof payload.sub === 'string' ? payload.sub : null,
      alkemio_actor_id: actorId,
      correlation_id: correlationId,
    });

    if (!getCorrelationId(req)) {
      (req as Request & Record<string, unknown>)[CORRELATION_ID_REQUEST_KEY] =
        correlationId;
    }

    return this.authService.createActorContext(actorId);
  }

  // Decode header without verify. Returns true only if alg===HS256.
  // Cheaper than running jose verify on every Hydra bearer that hits this
  // tertiary strategy.
  private static looksLikeHs256Token(token: string): boolean {
    const dot = token.indexOf('.');
    if (dot <= 0) return false;
    try {
      const headerJson = Buffer.from(token.slice(0, dot), 'base64url').toString(
        'utf8'
      );
      const header = JSON.parse(headerJson) as { alg?: string };
      return header.alg === 'HS256';
    } catch {
      return false;
    }
  }
}
