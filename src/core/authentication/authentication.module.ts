import { ActorContextModule } from '@core/actor-context/actor.context.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthenticationService } from './authentication.service';

// FR-025 — OryStrategy + OryApiStrategy retired. Auth strategies for both
// GraphQL and REST live in OidcModule (cookie-session, hydra-bearer).
@Module({
  imports: [
    PassportModule.register({ session: false }),
    ActorContextModule,
    // A module-scoped `CacheModule.register()` used to sit here. It built an
    // in-memory cache that nothing ever read: AuthenticationService does not
    // inject CACHE_MANAGER, and ActorContextCacheService — the one collaborator
    // that does — is declared in ActorContextModule, so Nest resolves its
    // dependencies there and it receives the global Redis cache regardless of
    // what this module imports. Removed as dead configuration (#6330), so that
    // "every cache is built by the shared factory" is a true statement rather
    // than one padded out with a decorative construction site.
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
