import { AlkemioErrorStatus, LogContext } from '@common/enums';
import { AuthenticationException } from '@common/exceptions';
import { SessionExpiredException } from '@common/exceptions/session.expired.exception';
import { ActorContext } from '@core/actor-context/actor.context';
import { ActorContextService } from '@core/actor-context/actor.context.service';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist';
import { PassportStrategy } from '@nestjs/passport';
import { KratosPayload } from '@services/infrastructure/kratos/types/kratos.payload';
import { AlkemioConfig } from '@src/types';
import { passportJwtSecret } from 'jwks-rsa';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticationService } from './authentication.service';
import { X_GUEST_NAME_HEADER } from './constants';
import { AUTH_STRATEGY_OATHKEEPER_JWT } from './strategy.names';
import { verifyIdentityIfOidcAuth } from './verify.identity.if.oidc.auth';

@Injectable()
export class OryStrategy extends PassportStrategy(
  Strategy,
  AUTH_STRATEGY_OATHKEEPER_JWT
) {
  constructor(
    private readonly configService: ConfigService<AlkemioConfig, true>,
    private readonly authService: AuthenticationService,
    private readonly authActorInfoService: ActorContextService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.get(
          'identity.authentication.providers.ory.jwks_uri',
          { infer: true }
        ),
      }),
      issuer: configService.get(
        'identity.authentication.providers.ory.issuer',
        { infer: true }
      ),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
      passReqToCallback: true, // Enable access to request object
    });
  }

  async validate(
    req: any,
    payload: KratosPayload
  ): Promise<ActorContext | null> {
    this.logger.debug?.('Ory Strategy: Kratos payload', LogContext.AUTH);
    this.logger.debug?.(payload, LogContext.AUTH);

    // Check for guest name header first when no valid session
    if (!payload.session) {
      this.logger.verbose?.('No Ory Kratos session', LogContext.AUTH);

      // Check for guest name in headers
      const guestName = req?.headers?.[X_GUEST_NAME_HEADER];
      if (guestName && guestName.trim().length > 0) {
        this.logger.verbose?.(
          `Creating guest actor context for: ${guestName}`,
          LogContext.AUTH
        );
        return this.authActorInfoService.createGuest(guestName.trim());
      }

      return this.authActorInfoService.createAnonymous();
    }

    if (hasExpired(Number(payload.session.expires_at))) {
      throw new SessionExpiredException(
        'Session has expired!',
        LogContext.AUTH,
        AlkemioErrorStatus.SESSION_EXPIRED
      );
    }

    // Require alkemio_actor_id in token - set by identity resolver webhook
    if (!payload.alkemio_actor_id) {
      this.logger.error?.(
        'Token missing alkemio_actor_id - identity resolver webhook not called?',
        LogContext.AUTH
      );
      throw new AuthenticationException(
        'Invalid token: missing actor identity',
        LogContext.AUTH
      );
    }

    const session = verifyIdentityIfOidcAuth(payload.session);

    // Build ActorContext using actorID directly from token (no user lookup needed)
    return this.authService.createActorContext(
      payload.alkemio_actor_id,
      session
    );
  }
}

const hasExpired = (exp: number): boolean => {
  return Date.now() >= exp * 1000;
};
