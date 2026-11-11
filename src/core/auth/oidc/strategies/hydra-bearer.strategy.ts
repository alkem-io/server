import { ActorContext } from '@core/actor-context/actor.context';
import { SecondFactorPolicyService } from '@core/auth/second-factor/second-factor.policy.service';
import {
  CORRELATION_ID_REQUEST_KEY,
  getCorrelationId,
} from '@core/middleware/correlation-id.middleware';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { Strategy } from 'passport-custom';
import { emitAudit } from '../audit';
import { SecondFactorRequiredError } from './auth.errors';
import {
  HydraBearerContext,
  HydraBearerValidator,
} from './hydra-bearer.validator';
import { AUTH_STRATEGY_OIDC_HYDRA_BEARER } from './strategy.names';

export type { HydraBearerContext } from './hydra-bearer.validator';
// Re-export so existing imports (oidc.module.ts) keep working without a
// move-find-replace touch in unrelated files.
export {
  BEARER_AUD_ALLOW_LIST_HANDLE,
  BEARER_JWKS_HANDLE,
  HYDRA_ISSUER_URL_HANDLE,
  HydraBearerValidator,
} from './hydra-bearer.validator';

// FR-024 / FR-024a — verify Hydra-issued JWTs against JWKS, allow-listed
// audiences, AND require alkemio_actor_id presence. Validation lives in
// `HydraBearerValidator` so the same crypto path is reused by
// `ResolveController` (forwardAuth) and any future consumer that needs
// to resolve identity from a Hydra bearer.
@Injectable()
export class HydraBearerStrategy extends PassportStrategy(
  Strategy,
  AUTH_STRATEGY_OIDC_HYDRA_BEARER
) {
  constructor(
    private readonly validator: HydraBearerValidator,
    private readonly secondFactorPolicy: SecondFactorPolicyService
  ) {
    super();
  }

  async validate(req: Request): Promise<ActorContext | null> {
    const auth = req.headers['authorization'];
    // FR-024b state-(a) — no Authorization header at all → anonymous fall-through.
    if (typeof auth !== 'string') return null;

    const correlationId = getCorrelationId(req) ?? randomUUID();
    // Validator throws BearerValidationError on malformed/sig-fail/expired/etc.
    // The interceptor maps that to 401 UNAUTHENTICATED per FR-024b state-(b).
    const result = await this.validator.validateAuthorizationHeader(
      auth,
      correlationId,
      correlationId
    );

    // Stash on request so resolvers can read uniform { sub, alkemio_actor_id,
    // client_id } regardless of which strategy validated.
    (req as Request & { alkemioBearer?: HydraBearerContext }).alkemioBearer =
      result.ctx;
    // Fallback correlation id if upstream middleware did not run.
    if (!getCorrelationId(req)) {
      (req as Request & Record<string, unknown>)[CORRELATION_ID_REQUEST_KEY] =
        correlationId;
    }

    // A request-scoped copy: the validator's actor is the shared cached one.
    // The token's `acr` alone decides, never its type or audience.
    const actor = Object.assign(new ActorContext(), result.actorContext, {
      secondFactor: { satisfied: result.ctx.acr === 'aal2' },
    });
    try {
      await this.secondFactorPolicy.assertNotRefused(actor, new Date());
    } catch (error) {
      if (error instanceof SecondFactorRequiredError) {
        emitAudit({
          event_type: 'auth.second_factor.refused',
          outcome: 'failure',
          sub: result.ctx.sub || null,
          client_id: result.ctx.client_id || null,
          correlation_id: correlationId,
          request_id: correlationId,
          error_code: 'second_factor_required',
        });
      }
      throw error;
    }
    return actor;
  }
}
