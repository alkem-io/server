import { LogContext } from '@common/enums/logging.context';
import {
  ForbiddenHttpException,
  UnauthenticatedHttpException,
} from '@common/exceptions/http';
import { ActorContext } from '@core/actor-context/actor.context';
import {
  BearerValidationError,
  CookieSessionInvalidError,
} from '@core/auth/oidc/strategies/auth.errors';
import {
  AUTH_STRATEGY_OIDC_COOKIE_SESSION,
  AUTH_STRATEGY_OIDC_HYDRA_BEARER,
} from '@core/auth/oidc/strategies/strategy.names';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

// FR-025 — REST endpoints accept the same two auth paths as GraphQL: cookie
// session (browser) and Hydra-issued Bearer (non-interactive API clients).
// Replaces the retired oathkeeper-jwt + oathkeeper-api-token chain.
@Injectable()
export class RestGuard extends AuthGuard([
  AUTH_STRATEGY_OIDC_COOKIE_SESSION,
  AUTH_STRATEGY_OIDC_HYDRA_BEARER,
]) {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super();
  }

  handleRequest<T extends ActorContext>(
    err: any,
    actorContext: T,
    _: any,
    _context: any,
    _status?: any
  ): T {
    if (err) {
      // FR-024b — credentials-present-but-invalid → 401 UNAUTHENTICATED.
      // Other errors keep the legacy 403 mapping (covers thrown errors that
      // are not strategy auth failures).
      if (
        err instanceof BearerValidationError ||
        err instanceof CookieSessionInvalidError
      ) {
        throw new UnauthenticatedHttpException(
          err?.message ?? String(err),
          LogContext.AUTH
        );
      }
      throw new ForbiddenHttpException(
        err?.message ?? String(err),
        LogContext.AUTH
      );
    }
    return actorContext;
  }
}
