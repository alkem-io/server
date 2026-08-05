import { CacheModule } from '@nestjs/cache-manager';
import { DynamicModule, LoggerService } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { createRedisCacheStore } from './cache.store.factory';

/**
 * The one cache registration in the codebase.
 *
 * `cache.store.factory.ts` deduplicated the *client* construction, which is
 * what stops a Redis blip terminating a process (#6330). This module
 * deduplicates the *registration* around it — `isGlobal`, the imports and the
 * inject list were still copy-pasted between `app.module.ts` and
 * `auth-reset.worker.module.ts`, each with a comment asserting they could no
 * longer drift, which nothing enforced. Now there is a single definition and
 * the assertion is true by construction.
 *
 * Both bootstraps import it; do not configure a `store` on any other
 * `CacheModule.register*`.
 */
export const redisCacheModule = (): DynamicModule =>
  CacheModule.registerAsync({
    isGlobal: true,
    imports: [ConfigModule],
    useFactory: async (
      configService: ConfigService<AlkemioConfig, true>,
      logger: LoggerService
    ) => ({
      store: createRedisCacheStore(
        configService.get('storage.redis', { infer: true }),
        logger
      ),
    }),
    inject: [ConfigService, WINSTON_MODULE_NEST_PROVIDER],
  });
