import { ActorContextModule } from '@core/actor-context/actor.context.module';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { KratosModule } from '@services/infrastructure/kratos/kratos.module';
import { AuthenticationService } from './authentication.service';

// FR-025 — OryStrategy + OryApiStrategy retired. Auth strategies for both
// GraphQL and REST live in OidcModule (cookie-session, hydra-bearer).
@Module({
  imports: [
    PassportModule.register({ session: false }),
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
  providers: [AuthenticationService],
  exports: [AuthenticationService],
})
export class AuthenticationModule {}
