import { UserService } from '@domain/user/user.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config/dist';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'simple-auth-jwt') {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService
  ) {
    super({
      secretOrKey: configService.get('simple_auth_provider').clientSecret,
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    });
  }

  async validate(payload: JwtPayload) {
    return await this.authService.populateAccountMapping(payload.email);
  }
}

export interface JwtPayload {
  email: string;
}
