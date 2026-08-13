import { ActorContextModule } from '@core/actor-context/actor.context.module';
import { NonInteractiveLoginModule } from '@core/auth/non-interactive-login/non-interactive-login.module';
import { AuthenticationModule } from '@core/authentication/authentication.module';
import { AuthorizationModule } from '@core/authorization/authorization.module';
import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { PlatformAuthorizationPolicyModule } from '@platform/authorization/platform.authorization.policy.module';
import { AlkemioConfig } from '@src/types';
import { createRemoteJWKSet } from 'jose';
import { AssistantForwardAuthController } from './assistant-forward-auth.controller';
import { parseBearerAudAllowList } from './bearer-aud-allow-list';
import { ForwardAuthController } from './forward-auth.controller';
import { ForwardAuthResolverService } from './forward-auth.resolver.service';
import { OidcController } from './oidc.controller';
import { OidcCoreModule } from './oidc-core.module';
import { CookieSessionStoreUnavailableFilter } from './strategies/cookie-session.exception-filter';
import { CookieSessionStrategy } from './strategies/cookie-session.strategy';
import {
  BEARER_AUD_ALLOW_LIST_HANDLE,
  BEARER_JWKS_HANDLE,
  HYDRA_ISSUER_URL_HANDLE,
  HydraBearerStrategy,
  HydraBearerValidator,
} from './strategies/hydra-bearer.strategy';

@Module({
  imports: [
    ConfigModule,
    // server#6315 — OidcService, the shared Redis client, SESSION_STORE_HANDLE
    // and OidcSessionRevocationService now live here so UserModule can reach
    // the revocation service without importing OidcModule (which would be a
    // cycle). Re-exported below, so this module's public surface is unchanged.
    OidcCoreModule,
    PassportModule,
    AuthenticationModule,
    ActorContextModule,
    NonInteractiveLoginModule,
    AuthorizationModule,
    PlatformAuthorizationPolicyModule,
  ],
  controllers: [
    OidcController,
    ForwardAuthController,
    AssistantForwardAuthController,
  ],
  providers: [
    ForwardAuthResolverService,
    CookieSessionStrategy,
    {
      provide: BEARER_JWKS_HANDLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { jwks_url } = configService.get(
          'identity.authentication.providers.oidc',
          { infer: true }
        );
        return createRemoteJWKSet(new URL(jwks_url));
      },
    },
    {
      provide: BEARER_AUD_ALLOW_LIST_HANDLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { bearer_aud_allow_list } = configService.get(
          'identity.authentication.providers.oidc',
          { infer: true }
        );
        return parseBearerAudAllowList(
          bearer_aud_allow_list,
          new Logger('BearerAudAllowList')
        );
      },
    },
    {
      provide: HYDRA_ISSUER_URL_HANDLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { issuer_url } = configService.get(
          'identity.authentication.providers.oidc',
          { infer: true }
        );
        // jose jwtVerify compares `iss` claim string-for-string against the
        // configured issuer. Pass through exactly as configured — Hydra v2
        // emits the discovery `issuer` and `iss` claim as URLS_SELF_ISSUER
        // verbatim (trailing slash included if env sets one).
        return issuer_url;
      },
    },
    HydraBearerValidator,
    HydraBearerStrategy,
    {
      provide: APP_FILTER,
      useClass: CookieSessionStoreUnavailableFilter,
    },
  ],
  exports: [OidcCoreModule],
})
export class OidcModule {}
