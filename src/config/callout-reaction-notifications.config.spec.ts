/**
 * Asserts the in-code defaults for the callout-reaction notification config
 * block resolve correctly when the corresponding env vars are absent, and that
 * each one is env-overridable (live test stacks must be able to shrink windows
 * to seconds for fast assertion).
 */

const ENV_VARS = [
  'CALLOUT_REACTION_NOTIFICATIONS_ENABLED',
  'CALLOUT_REACTION_EMAIL_SUPPRESSION_WINDOW_SECONDS',
] as const;

describe('callout-reaction notifications configuration defaults', () => {
  const origEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    for (const key of ENV_VARS) {
      origEnv[key] = process.env[key];
      delete process.env[key];
    }
    origEnv.ALKEMIO_CONFIG_PATH = process.env.ALKEMIO_CONFIG_PATH;
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

  it('defaults enabled to true when CALLOUT_REACTION_NOTIFICATIONS_ENABLED is absent', async () => {
    const factory = await loadConfiguration();
    const result = factory();
    expect(result.notifications.callout_reactions.enabled).toBe(true);
  });

  it('defaults email suppression window to 300 seconds', async () => {
    const factory = await loadConfiguration();
    const result = factory();
    expect(
      result.notifications.callout_reactions.email_suppression_window_seconds
    ).toBe(300);
  });

  it('enabled is env-overridable to false', async () => {
    process.env.CALLOUT_REACTION_NOTIFICATIONS_ENABLED = 'false';
    const factory = await loadConfiguration();
    const result = factory();
    expect(result.notifications.callout_reactions.enabled).toBe(false);
  });

  it('email_suppression_window_seconds is env-overridable for fast test stacks', async () => {
    process.env.CALLOUT_REACTION_EMAIL_SUPPRESSION_WINDOW_SECONDS = '5';
    const factory = await loadConfiguration();
    const result = factory();
    expect(
      result.notifications.callout_reactions.email_suppression_window_seconds
    ).toBe(5);
  });
});
