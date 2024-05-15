import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@domain/community/user/user.module';
import { AuthenticationService } from './authentication.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OryStrategy } from './ory.strategy';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { OryApiStrategy } from './ory.api.strategy';
import { AgentModule } from '@domain/agent/agent/agent.module';
@Module({
  imports: [
    PassportModule.register({
      session: false,
      defaultStrategy: 'oathkeeper-jwt',
    }),
    UserModule,
    AgentModule,
    CredentialModule,
    CacheModule.register(),
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
