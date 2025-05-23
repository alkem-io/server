import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PassportModule } from '@nestjs/passport';
import { AuthenticationService } from './authentication.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OryStrategy } from './ory.strategy';
import { OryApiStrategy } from './ory.api.strategy';
import { AuthenticationAgentInfoModule } from '@core/authentication.agent.info/agent.info.module';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { AgentModule } from '@domain/agent/agent/agent.module';
import { AUTH_STRATEGY_OATHKEEPER_JWT } from './strategy.names';
@Module({
  imports: [
    PassportModule.register({
      session: false,
      defaultStrategy: AUTH_STRATEGY_OATHKEEPER_JWT,
    }),
    AuthenticationAgentInfoModule,
    KratosModule,
    AgentModule,
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
