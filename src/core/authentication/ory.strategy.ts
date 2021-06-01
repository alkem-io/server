import { CherrytwistErrorStatus, ConfigurationTypes } from '@common/enums';
import { TokenException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthenticationService } from './authentication.service';
import { passportJwtSecret } from 'jwks-rsa';

@Injectable()
export class OryStrategy extends PassportStrategy(Strategy, 'oathkeeper-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthenticationService
  ) {
    super({
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.get(ConfigurationTypes.Identity)?.authentication
          ?.providers?.ory?.jwks_uri,
      }),
      issuer: configService.get(ConfigurationTypes.Identity)?.authentication
        ?.providers?.ory?.issuer,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
    });
  }

  async validate(payload: any) {
    if (await this.checkIfTokenHasExpired(payload.exp))
      throw new TokenException(
        'Access token has expired!',
        CherrytwistErrorStatus.TOKEN_EXPIRED
      );

    return await this.authService.createUserInfo(
      payload.session.identity.traits.email
    );
  }

  private async checkIfTokenHasExpired(exp: number): Promise<boolean> {
    if (Date.now() >= exp * 1000) {
      return true;
    }
    return false;
  }
}
