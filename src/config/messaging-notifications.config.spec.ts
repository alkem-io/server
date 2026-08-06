/**
 * 034-messaging-notifications — T007 (revised for Operator Ruling R4).
 *
 * Asserts the in-code defaults for the messaging-notifications config block
 * resolve correctly when the corresponding env vars are absent (Operator
 * Ruling 3b: none of these vars are declared on any deployment manifest this
 * release, so the literal defaults below govern everywhere until a future
 * release declares them), and that every one of them IS env-overridable —
 * the live test stacks must be able to run seconds-scale windows, because
 * test-suites cannot wait 20 minutes per assertion.
 */

const DIGEST_ENV_VARS = [
  'MESSAGING_NOTIFICATIONS_ENABLED',
  'MESSAGING_DIGEST_SWEEP_INTERVAL_SECONDS',
  'MESSAGING_DIGEST_MAX_DISPATCH_ATTEMPTS',
  'MESSAGING_DIGEST_RETRY_BACKOFF_SECONDS',
  'MESSAGING_DIGEST_PUSH_DIRECT_QUIET_SECONDS',
  'MESSAGING_DIGEST_PUSH_DIRECT_MAX_DELAY_SECONDS',
  'MESSAGING_DIGEST_PUSH_GROUP_QUIET_SECONDS',
  'MESSAGING_DIGEST_PUSH_GROUP_MAX_DELAY_SECONDS',
  'MESSAGING_DIGEST_EMAIL_DIRECT_QUIET_SECONDS',
  'MESSAGING_DIGEST_EMAIL_DIRECT_MAX_DELAY_SECONDS',
  'MESSAGING_DIGEST_EMAIL_GROUP_QUIET_SECONDS',
  'MESSAGING_DIGEST_EMAIL_GROUP_MAX_DELAY_SECONDS',
] as const;

describe('messaging notifications configuration defaults', () => {
  const origEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    for (const key of DIGEST_ENV_VARS) {
      origEnv[key] = process.env[key];
      delete process.env[key];
    }
    delete process.env.ALKEMIO_CONFIG_PATH;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const [key, val] of Object.entries(origEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
  });

  async function loadConfiguration() {
    const mod = await import('./configuration');
    return mod.default;
  }

  it('defaults enabled to true when MESSAGING_NOTIFICATIONS_ENABLED is absent (D-6)', async () => {
    const factory = await loadConfiguration();
    const result = factory();

    expect(result.notifications.messaging.enabled).toBe(true);
  });

  it('ships the D-20 quiet periods and delay caps for all four tracks', async () => {
    const factory = await loadConfiguration();
    const { digest } = factory().notifications.messaging;

    expect(digest.push.direct).toEqual({
      quiet_period_seconds: 60,
      max_delay_seconds: 300,
    });
    expect(digest.push.group).toEqual({
      quiet_period_seconds: 300,
      max_delay_seconds: 900,
    });
    expect(digest.email.direct).toEqual({
      quiet_period_seconds: 300,
      max_delay_seconds: 1800,
    });
    expect(digest.email.group).toEqual({
      quiet_period_seconds: 1200,
      max_delay_seconds: 3600,
    });
  });

  it('defaults the sweep to 10s and the dispatch retry to 3 attempts / 60s backoff', async () => {
    const factory = await loadConfiguration();
    const { digest } = factory().notifications.messaging;

    expect(digest.sweep_interval_seconds).toBe(10);
    expect(digest.max_dispatch_attempts).toBe(3);
    expect(digest.retry_backoff_seconds).toBe(60);
  });

  it('every digest key is env-overridable so the live stacks can run seconds-scale windows', async () => {
    process.env.MESSAGING_NOTIFICATIONS_ENABLED = 'false';
    process.env.MESSAGING_DIGEST_SWEEP_INTERVAL_SECONDS = '1';
    process.env.MESSAGING_DIGEST_MAX_DISPATCH_ATTEMPTS = '5';
    process.env.MESSAGING_DIGEST_RETRY_BACKOFF_SECONDS = '2';
    process.env.MESSAGING_DIGEST_PUSH_DIRECT_QUIET_SECONDS = '2';
    process.env.MESSAGING_DIGEST_PUSH_DIRECT_MAX_DELAY_SECONDS = '5';
    process.env.MESSAGING_DIGEST_PUSH_GROUP_QUIET_SECONDS = '3';
    process.env.MESSAGING_DIGEST_PUSH_GROUP_MAX_DELAY_SECONDS = '6';
    process.env.MESSAGING_DIGEST_EMAIL_DIRECT_QUIET_SECONDS = '4';
    process.env.MESSAGING_DIGEST_EMAIL_DIRECT_MAX_DELAY_SECONDS = '7';
    process.env.MESSAGING_DIGEST_EMAIL_GROUP_QUIET_SECONDS = '5';
    process.env.MESSAGING_DIGEST_EMAIL_GROUP_MAX_DELAY_SECONDS = '8';

    const factory = await loadConfiguration();
    const messaging = factory().notifications.messaging;

    expect(messaging.enabled).toBe(false);
    expect(messaging.digest.sweep_interval_seconds).toBe(1);
    expect(messaging.digest.max_dispatch_attempts).toBe(5);
    expect(messaging.digest.retry_backoff_seconds).toBe(2);
    expect(messaging.digest.push.direct).toEqual({
      quiet_period_seconds: 2,
      max_delay_seconds: 5,
    });
    expect(messaging.digest.email.group).toEqual({
      quiet_period_seconds: 5,
      max_delay_seconds: 8,
    });
  });

  it('R4/D-21: the deleted suppression window and volume budgets are gone from config', async () => {
    const factory = await loadConfiguration();
    const messaging: any = factory().notifications.messaging;

    expect(messaging).not.toHaveProperty('email_suppression_window_seconds');
    expect(messaging).not.toHaveProperty('email');
    // The messaging block no longer declares a push throttle of its own —
    // messaging does not participate in any push budget (FR-012).
    expect(messaging).not.toHaveProperty('push');
  });

  it('the shipped defaults satisfy the boot-time invariants', async () => {
    const { buildDigestConfig } = await import(
      '@services/event-handlers/internal/message-inbox/conversation.digest.config'
    );
    const factory = await loadConfiguration();

    expect(() =>
      buildDigestConfig(factory().notifications.messaging.digest)
    ).not.toThrow();
  });
});
