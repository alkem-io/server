export const PROXY_USAGE_KEY_PREFIX = 'msg:proxy:usage:';
export const PROXY_LIVE_KEY_PREFIX = 'msg:proxy:live:';
/** 45 days, the retention the gate consumer relies on. */
export const PROXY_USAGE_TTL_SECONDS = 45 * 24 * 60 * 60;
export const MINUTES_PER_DAY = 24 * 60;

export const utcDay = (date: Date): string => date.toISOString().slice(0, 10);

export const utcMinute = (date: Date): string =>
  date.toISOString().slice(11, 16);

export const usageKey = (day: string): string =>
  `${PROXY_USAGE_KEY_PREFIX}${day}`;
export const liveKey = (day: string): string =>
  `${PROXY_LIVE_KEY_PREFIX}${day}`;

export const bucketField = (parts: {
  surface: string;
  disposition: string;
  callerClass: string;
  roomType?: string;
  media: boolean;
}): string =>
  [
    parts.surface,
    parts.disposition,
    parts.callerClass,
    parts.roomType ?? '-',
    parts.media ? '1' : '0',
  ].join('|');

export type ParsedBucketField = {
  surface: string;
  disposition: string;
  callerClass: string;
  roomType?: string;
  media: boolean;
};

export const parseBucketField = (
  field: string
): ParsedBucketField | undefined => {
  const parts = field.split('|');
  if (parts.length !== 5) return undefined;
  const [surface, disposition, callerClass, roomType, media] = parts;
  return {
    surface,
    disposition,
    callerClass,
    roomType: roomType === '-' ? undefined : roomType,
    media: media === '1',
  };
};

/** Elapsed minutes of the current UTC day, the current minute included. */
export const elapsedUtcMinutes = (now: Date): number => {
  const startOfDay = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  return Math.min(
    MINUTES_PER_DAY,
    Math.floor((now.getTime() - startOfDay) / 60_000) + 1
  );
};

export const shiftUtcDay = (now: Date, daysBack: number): string => {
  const shifted = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysBack
    )
  );
  return utcDay(shifted);
};
