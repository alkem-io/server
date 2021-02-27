import { forwardRef, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@domain/user/user.module';
import { OidcBearerStrategy } from './oidc.bearer.strategy';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
@Module({
  imports: [
    PassportModule.register({ session: false, defaultStrategy: 'bearer' }),
    forwardRef(() => UserModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('simple_auth_provider').clientSecret,
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [OidcBearerStrategy, AuthService, JwtStrategy],
})
export class AuthModule {}
