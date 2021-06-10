import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@domain/community/user/user.module';
import { AuthenticationService } from './authentication.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AadBearerStrategy } from './aad.bearer.strategy';
import { OryStrategy } from './ory.strategy';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { SsiAgentModule } from '@src/services/platform/ssi/agent/ssi.agent.module';
@Module({
  imports: [
    PassportModule.register({ session: false, defaultStrategy: 'azure-ad' }),
    UserModule,
    CredentialModule,
    SsiAgentModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async () => ({
        signOptions: { expiresIn: '1d' },
      }),
    }),
  ],
  providers: [AadBearerStrategy, AuthenticationService, OryStrategy],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
