import { LogContext } from '@common/enums/logging.context';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { Cache, CachingConfig } from 'cache-manager';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { EntityManager } from 'typeorm';

@Injectable()
export class UrlGeneratorCacheService {
  cacheOptions: CachingConfig = {
    ttl: 1000,
  };

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
    @InjectEntityManager('default')
    private readonly entityManager: EntityManager
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

  // Revokes the per-profile URL cache for every callout, framing whiteboard,
  // and contribution (post / link / whiteboard / memo) reachable from the given
  // spaces. Used after a space subtree changes parent so that the URLs surfaced
  // in the activity log stop pointing at the old path.
  public async revokeUrlCachesForCalloutsInSpaces(
    spaceIds: string[]
  ): Promise<void> {
    if (spaceIds.length === 0) {
      return;
    }

    let rows: { profileId: string | null }[];
    try {
      rows = await this.entityManager.connection.query(
        `
        SELECT cf."profileId" AS "profileId"
        FROM "space" s
        JOIN "collaboration" co ON co."id" = s."collaborationId"
        JOIN "callout" c        ON c."calloutsSetId" = co."calloutsSetId"
        JOIN "callout_framing" cf ON cf."id" = c."framingId"
        WHERE s."id" = ANY($1)

        UNION ALL

        SELECT fwb."profileId" AS "profileId"
        FROM "space" s
        JOIN "collaboration" co ON co."id" = s."collaborationId"
        JOIN "callout" c        ON c."calloutsSetId" = co."calloutsSetId"
        JOIN "callout_framing" cf ON cf."id" = c."framingId"
        JOIN "whiteboard" fwb   ON fwb."id" = cf."whiteboardId"
        WHERE s."id" = ANY($1)

        UNION ALL

        SELECT p."profileId" AS "profileId"
        FROM "space" s
        JOIN "collaboration" co ON co."id" = s."collaborationId"
        JOIN "callout" c        ON c."calloutsSetId" = co."calloutsSetId"
        JOIN "callout_contribution" cc ON cc."calloutId" = c."id"
        JOIN "post" p           ON p."id" = cc."postId"
        WHERE s."id" = ANY($1)

        UNION ALL

        SELECT l."profileId" AS "profileId"
        FROM "space" s
        JOIN "collaboration" co ON co."id" = s."collaborationId"
        JOIN "callout" c        ON c."calloutsSetId" = co."calloutsSetId"
        JOIN "callout_contribution" cc ON cc."calloutId" = c."id"
        JOIN "link" l           ON l."id" = cc."linkId"
        WHERE s."id" = ANY($1)

        UNION ALL

        SELECT w."profileId" AS "profileId"
        FROM "space" s
        JOIN "collaboration" co ON co."id" = s."collaborationId"
        JOIN "callout" c        ON c."calloutsSetId" = co."calloutsSetId"
        JOIN "callout_contribution" cc ON cc."calloutId" = c."id"
        JOIN "whiteboard" w     ON w."id" = cc."whiteboardId"
        WHERE s."id" = ANY($1)

        UNION ALL

        SELECT m."profileId" AS "profileId"
        FROM "space" s
        JOIN "collaboration" co ON co."id" = s."collaborationId"
        JOIN "callout" c        ON c."calloutsSetId" = co."calloutsSetId"
        JOIN "callout_contribution" cc ON cc."calloutId" = c."id"
        JOIN "memo" m           ON m."id" = cc."memoId"
        WHERE s."id" = ANY($1)
        `,
        [spaceIds]
      );
    } catch (error) {
      const stack = error instanceof Error ? (error.stack ?? '') : '';
      this.logger.error(
        {
          message: 'Failed to invalidate URL caches for callout content',
          spaceIds,
        },
        stack,
        LogContext.URL_GENERATOR
      );
      return;
    }

    const profileIds = new Set<string>();
    for (const row of rows) {
      if (row.profileId) {
        profileIds.add(row.profileId);
      }
    }

    for (const profileId of profileIds) {
      try {
        await this.revokeUrlCache(profileId);
      } catch (error) {
        const stack = error instanceof Error ? (error.stack ?? '') : '';
        this.logger.error(
          {
            message:
              'Failed to invalidate URL cache for callout content profile',
            profileId,
          },
          stack,
          LogContext.URL_GENERATOR
        );
      }
    }
  }
}
