import { ActorContextModule } from '@core/actor-context/actor.context.module';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { AuthenticationService } from './authentication.service';
import { OryApiStrategy } from './ory.api.strategy';
import { OryStrategy } from './ory.strategy';
import { AUTH_STRATEGY_OATHKEEPER_JWT } from './strategy.names';
@Module({
  imports: [
    PassportModule.register({
      session: false,
      defaultStrategy: AUTH_STRATEGY_OATHKEEPER_JWT,
    }),
    ActorContextModule,
    KratosModule,
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
