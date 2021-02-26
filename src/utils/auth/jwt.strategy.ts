import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist';
import { PassportStrategy } from '@nestjs/passport';
import { AuthenticationException } from '@utils/error-handling/exceptions';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'simple-auth-jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {
    super({
      secretOrKey: configService.get('simple_auth_provider').clientSecret,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.getUserFromJwtPayload(payload);
    if (!user) {
      throw new AuthenticationException(
        'Failed to find user profile matching the email in jwt!'
      );
    }
    return user;
  }
}

export interface JwtPayload {
  email: string;
}
