import { LogContext } from '@common/enums';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class PushThrottleService {
  private readonly maxPerMinute: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {
    this.maxPerMinute = this.configService.get<number>(
      'notifications.push.throttle.max_per_minute' as any
    );
  }

  async isAllowed(userId: string): Promise<boolean> {
    const key = `push:throttle:${userId}`;

    const current = await this.cacheManager.get<number>(key);
    const count = current ?? 0;

    if (count >= this.maxPerMinute) {
      this.logger.verbose?.(
        { message: 'Push notification throttled for user', userId },
        LogContext.PUSH_NOTIFICATION
      );
      return false;
    }

    // Increment counter with 60-second TTL
    await this.cacheManager.set(key, count + 1, { ttl: 60 } as any);
    return true;
  }
}
