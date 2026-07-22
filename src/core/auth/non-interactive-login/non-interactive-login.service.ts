import { LogContext } from '@common/enums';
import { Inject, Injectable, type LoggerService } from '@nestjs/common';
import { IdentityResolveService } from '@services/api-rest/identity-resolve/identity-resolve.service';
import { KratosService } from '@services/infrastructure/kratos/kratos.service';
import { type OryDefaultIdentitySchema } from '@services/infrastructure/kratos/types/ory.default.identity.schema';
import { createHash } from 'crypto';
import { SignJWT } from 'jose';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NonInteractiveLoginAuditService } from './non-interactive-login.audit';
import { NonInteractiveLoginConfig } from './non-interactive-login.config';
import {
  NON_INTERACTIVE_LOGIN_ISSUER,
  type NonInteractiveLoginResponse,
} from './non-interactive-login.types';

export class NonInteractiveLoginInvalidCredentialsError extends Error {
  constructor() {
    super('invalid_credentials');
    this.name = 'NonInteractiveLoginInvalidCredentialsError';
  }
}

export class NonInteractiveLoginRateLimitedError extends Error {
  constructor() {
    super('rate_limited');
    this.name = 'NonInteractiveLoginRateLimitedError';
  }
}

export class NonInteractiveLoginActorIdMissingError extends Error {
  constructor() {
    super('actor_id_missing');
    this.name = 'NonInteractiveLoginActorIdMissingError';
  }
}

export class NonInteractiveLoginKratosUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('kratos_unavailable');
    this.name = 'NonInteractiveLoginKratosUnavailableError';
    if (cause) (this as Error & { cause?: unknown }).cause = cause;
  }
}

@Injectable()
export class NonInteractiveLoginService {
  constructor(
    private readonly kratosService: KratosService,
    private readonly identityResolveService: IdentityResolveService,
    private readonly config: NonInteractiveLoginConfig,
    private readonly audit: NonInteractiveLoginAuditService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public async mint(
    email: string,
    password: string
  ): Promise<NonInteractiveLoginResponse> {
    if (!this.config.enabled || !this.config.secretKey) {
      // Defense-in-depth: controller is gated, but mint() also refuses if
      // someone reaches it via DI by mistake.
      throw new NonInteractiveLoginKratosUnavailableError(
        new Error('non-interactive-login disabled')
      );
    }

    const emailHash = hashEmail(email);
    const identity = await this.loginAgainstKratos(email, password, emailHash);

    // Resolve (or lazily create) the Alkemio user for this Kratos identity.
    // Mirrors what the OIDC token-hook does in oidc-service: every token mint
    // calls `/rest/internal/identity/resolve` with the Kratos identity id
    // and stamps the returned actorID into the JWT. Doing the same here keeps
    // the two paths producing identical claims even for newly-registered users
    // whose `metadata_public.alkemio_actor_id` has never been populated.
    let actorId: string;
    try {
      const user = await this.identityResolveService.resolveUser(identity.id, {
        ip: undefined,
        userAgent: undefined,
      });
      actorId = user.id;
    } catch (e) {
      const err = e as Error;
      this.logger.error?.(
        `IdentityResolveService.resolveUser failed for kratos identity ${identity.id}: ${err.message}`,
        err.stack,
        LogContext.AUTH
      );
      this.audit.emit({
        event_type: 'non_interactive_login.actor_id_missing',
        outcome: 'failure',
        sub: identity.id,
        email_hash: emailHash,
        error_code: 'resolve_user_failed',
      });
      throw new NonInteractiveLoginActorIdMissingError();
    }

    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.config.tokenTtlSeconds;

    const apiToken = await new SignJWT({
      alkemio_actor_id: actorId,
      non_interactive_login: true,
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(NON_INTERACTIVE_LOGIN_ISSUER)
      .setSubject(identity.id)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(this.config.secretKey);

    this.audit.emit({
      event_type: 'non_interactive_login.token_minted',
      outcome: 'success',
      sub: identity.id,
      alkemio_actor_id: actorId,
      email_hash: emailHash,
    });

    return { api_token: apiToken, expires_at: exp, token_type: 'Bearer' };
  }

  // Calls Kratos native login flow with the supplied credentials. Returns
  // the identity object on success. Maps Kratos 429 → RateLimited, other 4xx →
  // InvalidCredentials, 5xx / network errors → KratosUnavailable.
  private async loginAgainstKratos(
    email: string,
    password: string,
    emailHash: string
  ): Promise<OryDefaultIdentitySchema> {
    const kratos = this.kratosService.kratosFrontEndClient;

    let flowId: string;
    try {
      const flow = await kratos.createNativeLoginFlow();
      flowId = flow.data.id;
    } catch (e) {
      const err = e as Error;
      this.logger.error?.(
        `Kratos createNativeLoginFlow failed: ${err.message}`,
        err.stack,
        LogContext.AUTH
      );
      this.audit.emit({
        event_type: 'non_interactive_login.kratos_unreachable',
        outcome: 'failure',
        email_hash: emailHash,
        error_code: 'create_flow_failed',
      });
      throw new NonInteractiveLoginKratosUnavailableError(e);
    }

    try {
      const session = await kratos.updateLoginFlow({
        flow: flowId,
        updateLoginFlowBody: {
          method: 'password',
          identifier: email,
          password,
        },
      });
      const identity = session.data.session.identity as
        | OryDefaultIdentitySchema
        | undefined;
      if (!identity) {
        throw new Error('kratos_returned_no_identity');
      }
      return identity;
    } catch (e) {
      const status = extractHttpStatus(e);
      if (status === 429) {
        // Kratos rate-limited the login flow. Distinct from a wrong password so
        // callers (and audit) can tell "slow down" from "bad credentials" — a
        // 429 folded into invalid_credentials makes load look like an auth bug
        // (test-suites#563).
        this.audit.emit({
          event_type: 'non_interactive_login.rate_limited',
          outcome: 'failure',
          email_hash: emailHash,
          error_code: 'kratos_429',
        });
        throw new NonInteractiveLoginRateLimitedError();
      }
      if (status !== null && status >= 400 && status < 500) {
        this.audit.emit({
          event_type: 'non_interactive_login.credentials_rejected',
          outcome: 'failure',
          email_hash: emailHash,
          error_code: `kratos_${status}`,
        });
        throw new NonInteractiveLoginInvalidCredentialsError();
      }
      const err = e as Error;
      this.logger.error?.(
        `Kratos updateLoginFlow failed (status=${status ?? 'network'}): ${err.message}`,
        err.stack,
        LogContext.AUTH
      );
      this.audit.emit({
        event_type: 'non_interactive_login.kratos_unreachable',
        outcome: 'failure',
        email_hash: emailHash,
        error_code: status === null ? 'network' : `kratos_${status}`,
      });
      throw new NonInteractiveLoginKratosUnavailableError(e);
    }
  }
}

function hashEmail(email: string): string {
  return createHash('sha256')
    .update(email.toLowerCase())
    .digest('hex')
    .slice(0, 16);
}

function extractHttpStatus(e: unknown): number | null {
  if (!e || typeof e !== 'object') return null;
  const obj = e as { response?: { status?: number }; status?: number };
  if (typeof obj.response?.status === 'number') return obj.response.status;
  if (typeof obj.status === 'number') return obj.status;
  return null;
}
