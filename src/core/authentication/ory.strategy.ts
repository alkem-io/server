import {
  AlkemioErrorStatus,
  ConfigurationTypes,
  LogContext,
} from '@common/enums';
import { TokenException } from '@common/exceptions';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthenticationService } from './authentication.service';
import { passportJwtSecret } from 'jwks-rsa';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { OryDefaultIdentitySchema } from './ory.default.identity.schema';
import { KratosPayload } from './kratos.payload';

@Injectable()
export class OryStrategy extends PassportStrategy(Strategy, 'oathkeeper-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthenticationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.get(ConfigurationTypes.IDENTITY)?.authentication
          ?.providers?.ory?.jwks_uri,
      }),
      issuer: configService.get(ConfigurationTypes.IDENTITY)?.authentication
        ?.providers?.ory?.issuer,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
    });
  }

  async validate(payload: KratosPayload) {
    this.logger.verbose?.('Ory Strategy: Kratos payload', LogContext.AUTH);
    this.logger.verbose?.(payload, LogContext.AUTH);

    if (checkIfTokenHasExpired(payload.exp))
      throw new TokenException(
        'Access token has expired!',
        AlkemioErrorStatus.TOKEN_EXPIRED
      );

    let oryIdentity: OryDefaultIdentitySchema | undefined = undefined;
    const session = payload.session;

    if (session) {
      oryIdentity = session.identity as OryDefaultIdentitySchema;

      if (this.authService.shouldExtendSession(session)) {
        this.authService.extendSession(session).catch(error => {
          this.logger.error(
            `Ory Kratos session failed to be extended: ${error}`,
            LogContext.AUTH
          );
        });
      }
    } else {
      this.logger.verbose?.('No Ory Kratos session', LogContext.AUTH);
    }

    return await this.authService.createAgentInfo(oryIdentity);
  }
}

const checkIfTokenHasExpired = (exp: number): boolean => {
  return Date.now() >= exp * 1000;
};
