import { REDIS_LOCK_SERVICE } from '@common/constants';
import { Global, Module } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { redisLockServiceFactory } from './redis.lock.service.factory';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_LOCK_SERVICE,
      useFactory: redisLockServiceFactory,
      inject: [CACHE_MANAGER],
    },
  ],
  exports: [REDIS_LOCK_SERVICE],
})
export class RedisLockModule {}
