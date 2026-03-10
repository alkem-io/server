import { LogContext } from '@common/enums/logging.context';
import { ICredential } from '@domain/actor/credential';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AlkemioConfig } from '@src/types';
import { Cache } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ActorContext } from './actor.context';

@Injectable()
export class ActorContextCacheService {
  private readonly cache_ttl: number;

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    private configService: ConfigService<AlkemioConfig, true>
  ) {
    this.cache_ttl = this.configService.get(
      'identity.authentication.cache_ttl',
      { infer: true }
    );
  }

  /**
   * Retrieves cached ActorContext by actorID.
   */
  public async getByActorID(
    actorID: string
  ): Promise<ActorContext | undefined> {
    return await this.cacheManager.get<ActorContext>(
      this.getActorIDCacheKey(actorID)
    );
  }

  /**
   * Deletes cached ActorContext by actorID.
   */
  public async deleteByActorID(actorID: string): Promise<void> {
    await this.cacheManager.del(this.getActorIDCacheKey(actorID));
  }

  /**
   * Caches ActorContext using the actorID as key.
   */
  public async setByActorID(ctx: ActorContext): Promise<ActorContext> {
    if (!ctx.actorID) {
      return ctx;
    }
    const cacheKey = this.getActorIDCacheKey(ctx.actorID);
    return await this.cacheManager.set<ActorContext>(cacheKey, ctx, {
      ttl: this.cache_ttl,
    });
  }

  /**
   * Updates cached ActorContext credentials when an actor's credentials change.
   */
  public async updateCredentialsByActorID(
    actorID: string,
    credentials: ICredential[]
  ): Promise<ActorContext | undefined> {
    const cached = await this.getByActorID(actorID);
    if (!cached) {
      this.logger.verbose?.(
        'No cache entry found for actorID. Skipping cache update.',
        LogContext.AUTH
      );
      return undefined;
    }

    cached.credentials = credentials;
    return await this.setByActorID(cached);
  }

  private getActorIDCacheKey(actorID: string): string {
    return `@actorContext:actorID:${actorID}`;
  }
}
