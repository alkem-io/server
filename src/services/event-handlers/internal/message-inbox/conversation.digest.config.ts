import {
  DIGEST_CHANNELS,
  DIGEST_KINDS,
  DigestChannel,
  DigestKind,
} from './conversation.digest.track';

/**
 * 034-messaging-notifications — data-model §6.
 *
 * Parses and VALIDATES the `notifications.messaging.digest` config block.
 * Pure (no Nest, no Redis) so the invariants are unit-testable without a
 * module graph; called from a service constructor so a violation fails the
 * application at boot rather than producing tracks that silently never fire.
 */

export interface DigestTrackWindows {
  quietPeriodSeconds: number;
  maxDelaySeconds: number;
}

export interface DigestConfig {
  sweepIntervalSeconds: number;
  maxDispatchAttempts: number;
  retryBackoffSeconds: number;
  windows: Record<DigestChannel, Record<DigestKind, DigestTrackWindows>>;
}

/**
 * Headroom added to `max_delay` for the per-track pending/first-seen/attempt
 * keys. They must outlive the longest possible wait plus a sweep or two, and
 * are disposable after that (FR-022).
 */
const STATE_TTL_HEADROOM_SECONDS = 300;

export const digestStateTtlSeconds = (windows: DigestTrackWindows): number =>
  windows.maxDelaySeconds + STATE_TTL_HEADROOM_SECONDS;

const requirePositiveInteger = (value: unknown, path: string): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(
      `Invalid messaging digest configuration: ${path} must be a positive integer, got ${JSON.stringify(value)}`
    );
  }
  return value;
};

const readWindows = (raw: any, path: string): DigestTrackWindows => {
  const quietPeriodSeconds = requirePositiveInteger(
    raw?.quiet_period_seconds,
    `${path}.quiet_period_seconds`
  );
  const maxDelaySeconds = requirePositiveInteger(
    raw?.max_delay_seconds,
    `${path}.max_delay_seconds`
  );
  // A quiet period longer than the cap means the cap always wins and the
  // debounce is dead code — almost certainly a typo, never intentional.
  if (quietPeriodSeconds > maxDelaySeconds) {
    throw new Error(
      `Invalid messaging digest configuration: ${path}.quiet_period_seconds (${quietPeriodSeconds}) must be <= ${path}.max_delay_seconds (${maxDelaySeconds})`
    );
  }
  return { quietPeriodSeconds, maxDelaySeconds };
};

/**
 * Builds the validated digest configuration, or throws.
 *
 * Invariants (data-model §6):
 *  - every value is a positive integer;
 *  - per track, `quiet_period_seconds <= max_delay_seconds`;
 *  - `sweep_interval_seconds <= min(all quiet periods)` — a sweep coarser
 *    than the tightest quiet period would systematically overshoot it.
 */
export const buildDigestConfig = (raw: any): DigestConfig => {
  const sweepIntervalSeconds = requirePositiveInteger(
    raw?.sweep_interval_seconds,
    'notifications.messaging.digest.sweep_interval_seconds'
  );
  const maxDispatchAttempts = requirePositiveInteger(
    raw?.max_dispatch_attempts,
    'notifications.messaging.digest.max_dispatch_attempts'
  );
  const retryBackoffSeconds = requirePositiveInteger(
    raw?.retry_backoff_seconds,
    'notifications.messaging.digest.retry_backoff_seconds'
  );

  const windows = {} as Record<
    DigestChannel,
    Record<DigestKind, DigestTrackWindows>
  >;
  for (const channel of DIGEST_CHANNELS) {
    windows[channel] = {} as Record<DigestKind, DigestTrackWindows>;
    for (const kind of DIGEST_KINDS) {
      windows[channel][kind] = readWindows(
        raw?.[channel]?.[kind],
        `notifications.messaging.digest.${channel}.${kind}`
      );
    }
  }

  const minQuietPeriodSeconds = Math.min(
    ...DIGEST_CHANNELS.flatMap(channel =>
      DIGEST_KINDS.map(kind => windows[channel][kind].quietPeriodSeconds)
    )
  );
  if (sweepIntervalSeconds > minQuietPeriodSeconds) {
    throw new Error(
      `Invalid messaging digest configuration: notifications.messaging.digest.sweep_interval_seconds (${sweepIntervalSeconds}) must be <= the smallest configured quiet period (${minQuietPeriodSeconds})`
    );
  }

  return {
    sweepIntervalSeconds,
    maxDispatchAttempts,
    retryBackoffSeconds,
    windows,
  };
};
