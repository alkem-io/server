import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@domain/community/user/user.module';
import { AuthenticationService } from './authentication.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AadBearerStrategy } from './aad.bearer.strategy';
import { ConfigurationTypes } from '@common/enums';
@Module({
  imports: [
    PassportModule.register({ session: false, defaultStrategy: 'azure-ad' }),
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get(ConfigurationTypes.Identity)?.authentication
          ?.providers?.demo_auth_provider?.clientSecret,
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AadBearerStrategy, AuthenticationService, JwtStrategy],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
