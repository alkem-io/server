import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { PassportModule } from '@nestjs/passport';
import { AlkemioConfig } from '@src/types';
import Redis from 'ioredis';
import { OidcController } from './oidc.controller';
import { OidcService } from './oidc.service';
import { buildSessionStore } from './session-store.redis';
import { SESSION_STORE_HANDLE } from './strategies/cookie-session.errors';
import { CookieSessionStoreUnavailableFilter } from './strategies/cookie-session.exception-filter';
import { CookieSessionStrategy } from './strategies/cookie-session.strategy';

@Module({
  imports: [ConfigModule, PassportModule],
  controllers: [OidcController],
  providers: [
    OidcService,
    {
      provide: SESSION_STORE_HANDLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AlkemioConfig, true>) => {
        const { host, port } = configService.get('storage.redis', {
          infer: true,
        });
        const client = new Redis({ host, port: Number(port) });
        return buildSessionStore(client);
      },
    },
    CookieSessionStrategy,
    {
      provide: APP_FILTER,
      useClass: CookieSessionStoreUnavailableFilter,
    },
  ],
  exports: [OidcService],
})
export class OidcModule {}
