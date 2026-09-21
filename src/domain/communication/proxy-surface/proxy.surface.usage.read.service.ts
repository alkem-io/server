import { RoomType } from '@common/enums/room.type';
import { Inject, Injectable } from '@nestjs/common';
import { MESSAGING_REDIS_CLIENT } from '@services/infrastructure/redis-client/messaging-redis.provider';
import type { Redis } from 'ioredis';
import {
  ProxyCallerClassGql,
  ProxySurfaceDispositionGql,
} from './dto/proxy.surface.usage.enums';
import {
  ProxySurfaceUsageDay,
  ProxySurfaceUsageResult,
  ProxySurfaceUsageRow,
} from './dto/proxy.surface.usage.result';
import {
  elapsedUtcMinutes,
  liveKey,
  MINUTES_PER_DAY,
  parseBucketField,
  shiftUtcDay,
  usageKey,
} from './proxy.surface.usage.keys';

/**
 * Operator read side of the proxy usage ledger. Days with neither a usage
 * hash nor a liveness hash are omitted — absence is "no data", never zero.
 */
@Injectable()
export class ProxySurfaceUsageReadService {
  constructor(@Inject(MESSAGING_REDIS_CLIENT) private readonly redis: Redis) {}

  async read(
    days: number,
    now: Date = new Date()
  ): Promise<ProxySurfaceUsageResult> {
    const today = shiftUtcDay(now, 0);
    const from = shiftUtcDay(now, days - 1);
    const result: ProxySurfaceUsageDay[] = [];

    for (let back = days - 1; back >= 0; back--) {
      const day = shiftUtcDay(now, back);
      const [usage, live] = await Promise.all([
        this.redis.hgetall(usageKey(day)),
        this.redis.hgetall(liveKey(day)),
      ]);
      const hasUsage = Object.keys(usage ?? {}).length > 0;
      const liveMinutes = Object.keys(live ?? {}).length;
      if (!hasUsage && liveMinutes === 0) continue;

      result.push({
        day,
        livenessMinutes: liveMinutes,
        expectedMinutes:
          day === today ? elapsedUtcMinutes(now) : MINUTES_PER_DAY,
        rows: this.toRows(usage ?? {}),
      });
    }

    return { from, to: today, days: result };
  }

  private toRows(usage: Record<string, string>): ProxySurfaceUsageRow[] {
    const rows: ProxySurfaceUsageRow[] = [];
    for (const [field, value] of Object.entries(usage)) {
      const parsed = parseBucketField(field);
      const count = Number.parseInt(value, 10);
      if (!parsed || !Number.isFinite(count)) continue;
      rows.push({
        surface: parsed.surface,
        disposition: parsed.disposition as ProxySurfaceDispositionGql,
        callerClass: parsed.callerClass as ProxyCallerClassGql,
        roomType: parsed.roomType as RoomType | undefined,
        media: parsed.media,
        count,
      });
    }
    return rows.sort((a, b) =>
      `${a.surface}|${a.disposition}|${a.callerClass}|${a.roomType ?? '-'}|${a.media}`.localeCompare(
        `${b.surface}|${b.disposition}|${b.callerClass}|${b.roomType ?? '-'}|${b.media}`
      )
    );
  }
}
