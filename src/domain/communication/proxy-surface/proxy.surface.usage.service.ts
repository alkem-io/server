import { LogContext } from '@common/enums';
import { RoomType } from '@common/enums/room.type';
import {
  Inject,
  Injectable,
  LoggerService,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import { AlkemioConfig } from '@src/types';
import type { Redis } from 'ioredis';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { deriveCallerClass } from './proxy.caller.class';
import {
  isCountedDisposition,
  resolveDisposition,
} from './proxy.surface.disposition';
import { getProxySurfaceEntry } from './proxy.surface.inventory';
import {
  bucketField,
  liveKey,
  PROXY_USAGE_TTL_SECONDS,
  usageKey,
  utcDay,
  utcMinute,
} from './proxy.surface.usage.keys';

export type ProxySurfaceUsageRecord = {
  /** Frozen surface id, e.g. 'Mutation.sendMessageToRoom'. */
  surface: string;
  /** Room kind once known; omitted for surfaces without a room. */
  roomType?: RoomType | string;
  /** Whether the call carried attachments. */
  media?: boolean;
  /** The admitting request; caller class is derived from it. */
  req: unknown;
};

/**
 * Proxy usage ledger: in-process aggregation of counted proxy calls,
 * flushed periodically to the messaging Redis in one pipeline together with
 * a per-minute liveness mark. Counting is synchronous and never touches
 * Redis; a Redis failure drops the interval's counts (fail-open) and is
 * logged. The kill switch stops counting and liveness alike, so a disabled
 * ledger reads as "no data", never as zero.
 */
@Injectable()
export class ProxySurfaceUsageService
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly enabled: boolean;
  private readonly flushIntervalMs: number;
  // UTC day at count time → bucket field → count, so calls counted just
  // before midnight are written to that day even when flushed after it.
  private buckets = new Map<string, Map<string, number>>();
  private timer?: ReturnType<typeof setInterval>;
  private unknownSurfacesWarned = new Set<string>();

  constructor(
    @Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis,
    configService: ConfigService<AlkemioConfig, true>,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService
  ) {
    const config = configService.get('communications.proxy_usage', {
      infer: true,
    });
    this.enabled = config?.enabled ?? true;
    this.flushIntervalMs = Math.max(1000, config?.flush_interval_ms ?? 10_000);
  }

  get isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Count one call. Resolves the disposition from the surface classification
   * and the room kind; retained control-plane surfaces are never counted.
   * Synchronous: no I/O on the request path.
   */
  record(input: ProxySurfaceUsageRecord): void {
    if (!this.enabled) return;

    const entry = getProxySurfaceEntry(input.surface);
    if (!entry) {
      if (!this.unknownSurfacesWarned.has(input.surface)) {
        this.unknownSurfacesWarned.add(input.surface);
        this.logger.warn?.(
          `Proxy usage: surface '${input.surface}' is not classified — not counted`,
          LogContext.COMMUNICATION
        );
      }
      return;
    }

    const media = input.media ?? false;
    const disposition = resolveDisposition(entry, input.roomType, media);
    if (!isCountedDisposition(disposition) || !disposition) return;

    const field = bucketField({
      surface: input.surface,
      disposition,
      callerClass: deriveCallerClass(input.req),
      roomType: input.roomType,
      media,
    });
    const day = utcDay(new Date());
    let dayBuckets = this.buckets.get(day);
    if (!dayBuckets) {
      dayBuckets = new Map();
      this.buckets.set(day, dayBuckets);
    }
    dayBuckets.set(field, (dayBuckets.get(field) ?? 0) + 1);
  }

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log?.(
        'Proxy usage ledger disabled — no counting, no liveness heartbeat',
        LogContext.COMMUNICATION
      );
      return;
    }
    this.timer = setInterval(() => {
      void this.flush();
    }, this.flushIntervalMs);
    this.timer.unref?.();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    await this.flush();
  }

  /**
   * One pipeline: HINCRBY per bucket of the interval into the day it was
   * counted, the liveness minute mark, and the 45-day expiry on every hash
   * written. The liveness mark is written even when nothing was counted —
   * that is what makes a zero meaningful.
   */
  async flush(now: Date = new Date()): Promise<void> {
    if (!this.enabled) return;

    const day = utcDay(now);
    const snapshot = this.buckets;
    this.buckets = new Map();
    const usageDays = new Set([day, ...snapshot.keys()]);

    try {
      const pipeline = this.redis.pipeline();
      for (const [countedDay, dayBuckets] of snapshot) {
        for (const [field, count] of dayBuckets) {
          pipeline.hincrby(usageKey(countedDay), field, count);
        }
      }
      pipeline.hset(liveKey(day), utcMinute(now), '1');
      for (const usageDay of usageDays) {
        pipeline.expire(usageKey(usageDay), PROXY_USAGE_TTL_SECONDS);
      }
      pipeline.expire(liveKey(day), PROXY_USAGE_TTL_SECONDS);

      const results = await pipeline.exec();
      const failure = results?.find(([error]) => error)?.[0];
      if (failure) throw failure;
    } catch (error: any) {
      // Fail open: the interval's counts are dropped, the operation that was
      // counted has long since completed, and the missing liveness minute is
      // what tells the gate consumer this interval is "no data".
      this.logger.error?.(
        `Proxy usage ledger flush failed; dropped the buckets for ${[...snapshot.keys()].join(', ') || day}: ${error?.message}`,
        error?.stack,
        LogContext.COMMUNICATION
      );
    }
  }

  /** Test seam: the buckets aggregated since the last flush, across days. */
  pendingBuckets(): ReadonlyMap<string, number> {
    const merged = new Map<string, number>();
    for (const dayBuckets of this.buckets.values()) {
      for (const [field, count] of dayBuckets) {
        merged.set(field, (merged.get(field) ?? 0) + count);
      }
    }
    return merged;
  }
}
