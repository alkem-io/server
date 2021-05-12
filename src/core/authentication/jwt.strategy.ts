import { CherrytwistErrorStatus } from '@common/enums';
import { TokenException } from '@common/exceptions';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthenticationService } from './authentication.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'demo-auth-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthenticationService
  ) {
    super({
      secretOrKey: configService.get('identity')?.authentication?.providers
        ?.demo_auth_provider?.clientSecret,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: true,
    });
  }

  async validate(payload: JwtPayload) {
    if (await this.checkIfTokenHasExpired(payload.exp))
      throw new TokenException(
        'Access token has expired!',
        CherrytwistErrorStatus.TOKEN_EXPIRED
      );

    return await this.authService.createUserInfo(payload.email);
  }

  private async checkIfTokenHasExpired(exp: number): Promise<boolean> {
    if (Date.now() >= exp * 1000) {
      return true;
    }
    return false;
  }
}

export interface JwtPayload {
  email: string;
  exp: number;
}
