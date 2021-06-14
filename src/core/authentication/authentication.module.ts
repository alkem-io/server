import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@domain/community/user/user.module';
import { AuthenticationService } from './authentication.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OryStrategy } from './ory.strategy';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { OryApiStrategy } from './ory.api.strategy';
@Module({
  imports: [
    PassportModule.register({
      session: false,
      defaultStrategy: 'oathkeeper-jwt',
    }),
    UserModule,
    CredentialModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async () => ({
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AuthenticationService, OryStrategy, OryApiStrategy],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
