import { CacheModule, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from '@domain/community/user/user.module';
import { AuthenticationService } from './authentication.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OryStrategy } from './ory.strategy';
import { CredentialModule } from '@domain/agent/credential/credential.module';
import { OryApiStrategy } from './ory.api.strategy';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AgentInfoCacheService } from '@core/authentication.agent.info/agent-info.cache.service';
import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/authentication.agent.info.module';
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
    AuthenticationAgentInfoModule,
  ],
  providers: [
    AuthenticationService,
    OryStrategy,
    OryApiStrategy,
    AgentInfoCacheService,
  ],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
