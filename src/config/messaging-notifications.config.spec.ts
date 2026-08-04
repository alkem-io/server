/**
 * 034-messaging-notifications — T003.
 *
 * Asserts the in-code defaults for the messaging-notifications config block
 * resolve correctly when the corresponding env vars are absent (Operator
 * Ruling 3b: none of these vars are declared on any deployment manifest this
 * release, so the literal defaults below govern everywhere until a future
 * release declares them).
 */
describe('messaging notifications configuration defaults', () => {
  const origEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    origEnv.MESSAGING_NOTIFICATIONS_ENABLED =
      process.env.MESSAGING_NOTIFICATIONS_ENABLED;
    origEnv.MESSAGING_EMAIL_SUPPRESSION_WINDOW_SECONDS =
      process.env.MESSAGING_EMAIL_SUPPRESSION_WINDOW_SECONDS;
    origEnv.MESSAGING_PUSH_THROTTLE_MAX_PER_MINUTE =
      process.env.MESSAGING_PUSH_THROTTLE_MAX_PER_MINUTE;
    origEnv.MESSAGING_EMAIL_BUDGET_MAX_PER_WINDOW =
      process.env.MESSAGING_EMAIL_BUDGET_MAX_PER_WINDOW;
    origEnv.MESSAGING_EMAIL_BUDGET_WINDOW_SECONDS =
      process.env.MESSAGING_EMAIL_BUDGET_WINDOW_SECONDS;
    delete process.env.MESSAGING_NOTIFICATIONS_ENABLED;
    delete process.env.MESSAGING_EMAIL_SUPPRESSION_WINDOW_SECONDS;
    delete process.env.MESSAGING_PUSH_THROTTLE_MAX_PER_MINUTE;
    delete process.env.MESSAGING_EMAIL_BUDGET_MAX_PER_WINDOW;
    delete process.env.MESSAGING_EMAIL_BUDGET_WINDOW_SECONDS;
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

  it('defaults the email suppression window to 300 seconds when absent (D-8)', async () => {
    const factory = await loadConfiguration();
    const result = factory();

    expect(
      result.notifications.messaging.email_suppression_window_seconds
    ).toBe(300);
  });

  it('defaults the messaging push throttle to 10/min when absent (D-9)', async () => {
    const factory = await loadConfiguration();
    const result = factory();

    expect(result.notifications.messaging.push.throttle.max_per_minute).toBe(
      10
    );
  });

  it('honors env overrides when present', async () => {
    process.env.MESSAGING_NOTIFICATIONS_ENABLED = 'false';
    process.env.MESSAGING_EMAIL_SUPPRESSION_WINDOW_SECONDS = '120';
    process.env.MESSAGING_PUSH_THROTTLE_MAX_PER_MINUTE = '5';
    process.env.MESSAGING_EMAIL_BUDGET_MAX_PER_WINDOW = '7';
    process.env.MESSAGING_EMAIL_BUDGET_WINDOW_SECONDS = '60';

    const factory = await loadConfiguration();
    const result = factory();

    expect(result.notifications.messaging.enabled).toBe(false);
    expect(
      result.notifications.messaging.email_suppression_window_seconds
    ).toBe(120);
    expect(result.notifications.messaging.push.throttle.max_per_minute).toBe(5);
    expect(result.notifications.messaging.email.budget.max_per_window).toBe(7);
    expect(result.notifications.messaging.email.budget.window_seconds).toBe(60);
  });

  it('sec-server-10: defaults the global email budget to 20 per 3600s (1h) when absent', async () => {
    const factory = await loadConfiguration();
    const result = factory();

    expect(result.notifications.messaging.email.budget.max_per_window).toBe(20);
    expect(result.notifications.messaging.email.budget.window_seconds).toBe(
      3600
    );
  });
});
