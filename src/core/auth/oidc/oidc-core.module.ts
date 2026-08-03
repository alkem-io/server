import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import Redis from 'ioredis';
import { OidcService } from './oidc.service';
import { OIDC_REDIS_CLIENT } from './oidc.tokens';
import { OidcSessionRevocationService } from './revocation/oidc-session-revocation.service';
import { buildSessionStore } from './session-store.redis';
import { SESSION_STORE_HANDLE } from './strategies/cookie-session.errors';

/**
 * The dependency-light foundation of the OIDC session layer (server#6315).
 *
 * **Why this module exists.** `UserService.deleteUser` needs
 * `OidcSessionRevocationService`, but `UserModule` cannot import `OidcModule`:
 * that module pulls in `AuthenticationModule`, `ActorContextModule`,
 * `AuthorizationModule` and `PlatformAuthorizationPolicyModule`, several of
 * which sit above `UserModule`. Importing it would be a dependency cycle, which
 * the engineering constitution forbids outright ("Circular dependencies are
 * forbidden — violations require redesign"). `forwardRef` was rejected: it makes
 * the cycle legal rather than absent.
 *
 * This module's only import is `ConfigModule`, so it can be imported from
 * anywhere — `OidcModule` and `UserModule` both do, and Nest instantiates its
 * providers exactly once.
 *
 * It also removes a latent problem rather than adding one: `OidcService` and
 * `SESSION_STORE_HANDLE` were previously declared inline in `OidcModule`, where
 * the store handle constructed its own Redis client. Both are *moved* here, not
 * duplicated, and the client is now shared with the per-subject session index —
 * so this change adds zero Redis connections.
 *
 * `OidcModule` re-exports this module, so its public surface is unchanged.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    OidcService,
    {
      provide: OIDC_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { host, port } = configService.get('storage.redis', {
          infer: true,
        });
        return new Redis({ host, port: Number(port) });
      },
    },
    {
      provide: SESSION_STORE_HANDLE,
      inject: [OIDC_REDIS_CLIENT],
      useFactory: (client: Redis) => buildSessionStore(client),
    },
    OidcSessionRevocationService,
  ],
  exports: [
    OidcService,
    OIDC_REDIS_CLIENT,
    SESSION_STORE_HANDLE,
    OidcSessionRevocationService,
  ],
})
export class OidcCoreModule {}
