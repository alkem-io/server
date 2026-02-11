import { LogContext } from '@common/enums/logging.context';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cache, CachingConfig } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@Injectable()
export class UrlGeneratorCacheService {
  cacheOptions: CachingConfig = {
    ttl: 1000,
  };

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  public getUrlIdCacheKey(entityId: string): string {
    return `@url:urlGeneratorId:${entityId}`;
  }

  public async setUrlCache(entityId: string, url: string) {
    await this.cacheManager.set(
      this.getUrlIdCacheKey(entityId),
      url,
      this.cacheOptions
    );
  }

  public async revokeUrlCache(entityId: string): Promise<void> {
    await this.cacheManager.del(this.getUrlIdCacheKey(entityId));
  }

  public async getUrlFromCache(entityId: string): Promise<string | undefined> {
    const url = await this.cacheManager.get<string>(
      this.getUrlIdCacheKey(entityId)
    );
    if (url) {
      this.logger.verbose?.(
        `Using cached url for entity: ${url}`,
        LogContext.URL_GENERATOR
      );
    }
    return url;
  }
}
