import { describe, expect, it } from 'vitest';
import {
  buildDigestConfig,
  digestStateTtlSeconds,
} from './conversation.digest.config';

const validRaw = () => ({
  sweep_interval_seconds: 10,
  max_dispatch_attempts: 3,
  retry_backoff_seconds: 60,
  push: {
    direct: { quiet_period_seconds: 60, max_delay_seconds: 300 },
    group: { quiet_period_seconds: 300, max_delay_seconds: 900 },
  },
  email: {
    direct: { quiet_period_seconds: 300, max_delay_seconds: 1800 },
    group: { quiet_period_seconds: 1200, max_delay_seconds: 3600 },
  },
});

describe('buildDigestConfig (data-model §6)', () => {
  it('parses the shipped production defaults (D-20)', () => {
    const config = buildDigestConfig(validRaw());

    expect(config.sweepIntervalSeconds).toBe(10);
    expect(config.maxDispatchAttempts).toBe(3);
    expect(config.retryBackoffSeconds).toBe(60);
    expect(config.windows.push.direct).toEqual({
      quietPeriodSeconds: 60,
      maxDelaySeconds: 300,
    });
    expect(config.windows.email.group).toEqual({
      quietPeriodSeconds: 1200,
      maxDelaySeconds: 3600,
    });
  });

  it('the defaults bound the worst case to 12/4/2/1 dispatches per recipient per hour (SC-010)', () => {
    const config = buildDigestConfig(validRaw());
    const perHour = (maxDelaySeconds: number) => 3600 / maxDelaySeconds;

    expect(perHour(config.windows.push.direct.maxDelaySeconds)).toBe(12);
    expect(perHour(config.windows.push.group.maxDelaySeconds)).toBe(4);
    expect(perHour(config.windows.email.direct.maxDelaySeconds)).toBe(2);
    expect(perHour(config.windows.email.group.maxDelaySeconds)).toBe(1);
  });

  it('accepts seconds-scale windows so the live test stacks can run (Ruling 3b)', () => {
    const config = buildDigestConfig({
      ...validRaw(),
      sweep_interval_seconds: 1,
      push: {
        direct: { quiet_period_seconds: 2, max_delay_seconds: 5 },
        group: { quiet_period_seconds: 2, max_delay_seconds: 5 },
      },
      email: {
        direct: { quiet_period_seconds: 2, max_delay_seconds: 5 },
        group: { quiet_period_seconds: 2, max_delay_seconds: 5 },
      },
    });

    expect(config.windows.push.direct.quietPeriodSeconds).toBe(2);
  });

  describe('fail-fast validation', () => {
    it('rejects a quiet period longer than its own cap (the debounce would be dead code)', () => {
      const raw = validRaw();
      raw.push.direct = {
        quiet_period_seconds: 600,
        max_delay_seconds: 300,
      };

      expect(() => buildDigestConfig(raw)).toThrow(
        /push\.direct\.quiet_period_seconds \(600\) must be <= .*max_delay_seconds \(300\)/
      );
    });

    it('rejects a sweep coarser than the tightest quiet period (it would systematically overshoot)', () => {
      const raw = validRaw();
      raw.sweep_interval_seconds = 120;

      expect(() => buildDigestConfig(raw)).toThrow(
        /sweep_interval_seconds \(120\) must be <= the smallest configured quiet period \(60\)/
      );
    });

    it('rejects a missing track outright rather than defaulting it', () => {
      const raw: any = validRaw();
      delete raw.email.group;

      expect(() => buildDigestConfig(raw)).toThrow(
        /email\.group\.quiet_period_seconds must be a positive integer/
      );
    });

    it.each([
      0,
      -1,
      1.5,
      '60',
      null,
      undefined,
    ])('rejects %p as a window value', value => {
      const raw: any = validRaw();
      raw.push.group.max_delay_seconds = value;

      expect(() => buildDigestConfig(raw)).toThrow(
        /must be a positive integer/
      );
    });

    it('rejects a missing digest block entirely', () => {
      expect(() => buildDigestConfig(undefined)).toThrow(
        /sweep_interval_seconds must be a positive integer/
      );
    });
  });

  it('gives per-track state enough TTL to outlive the longest wait', () => {
    expect(
      digestStateTtlSeconds({ quietPeriodSeconds: 60, maxDelaySeconds: 300 })
    ).toBe(600);
    expect(
      digestStateTtlSeconds({
        quietPeriodSeconds: 1200,
        maxDelaySeconds: 3600,
      })
    ).toBe(3900);
  });
});
