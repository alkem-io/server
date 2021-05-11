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
    });
  }

  async validate(payload: JwtPayload) {
    return await this.authService.createUserInfo(payload.email);
  }
}

export interface JwtPayload {
  email: string;
}
