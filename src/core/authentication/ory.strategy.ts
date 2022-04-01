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

  async validate(payload: any) {
    this.logger.verbose?.('Ory Strategy: Kratos payload', LogContext.AUTH);
    this.logger.verbose?.(payload, LogContext.AUTH);

    if (this.checkIfTokenHasExpired(payload.exp))
      throw new TokenException(
        'Access token has expired!',
        AlkemioErrorStatus.TOKEN_EXPIRED
      );

    // Todo: not sure this is correct, but am hitting a case whereby session is null
    let oryIdentity: OryDefaultIdentitySchema | undefined = undefined;
    if (payload.session) {
      oryIdentity = payload.session.identity as OryDefaultIdentitySchema;
    } else {
      this.logger.verbose?.('No Ory Kratos session', LogContext.AUTH);
    }

    return await this.authService.createAgentInfo(oryIdentity);
  }

  private checkIfTokenHasExpired(exp: number): boolean {
    if (Date.now() >= exp * 1000) {
      return true;
    }
    return false;
  }
}
