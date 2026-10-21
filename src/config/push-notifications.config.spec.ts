/**
 * 086-app-push-mvp. Binds `alkemio.yml` to the dotted path
 * `NativePushSenderService` actually reads for the APNs host.
 *
 * The sender's own spec injects a `{ get: key => config[key] }` stub keyed by
 * dotted strings, so it is self-consistent with the service and completely
 * BLIND to the YAML: rename the key, move it one level up under `push:`, or
 * typo the env variable in `alkemio.yml`, and every one of those tests stays
 * green while `configService.get(...)` starts returning `undefined` — which
 * resolves to the sandbox host, boots clean, and silently deletes every
 * production iOS token on first send. This file is the one test that fails on
 * that regression. House pattern: `messaging-notifications.config.spec.ts`.
 */

const PUSH_ENV_VARS = ['APNS_ENVIRONMENT'] as const;

describe('push notifications configuration (APNs host)', () => {
  const origEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    for (const key of PUSH_ENV_VARS) {
      origEnv[key] = process.env[key];
      delete process.env[key];
    }
    // Captured like the rest so `afterEach` puts it back — deleting it
    // without restoring would leak into every later test in this worker.
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

  it('resolves `notifications.push.apns.environment` to the string "sandbox" when APNS_ENVIRONMENT is absent', async () => {
    const factory = await loadConfiguration();

    const apns = factory().notifications.push.apns;

    // The STRING, not `undefined` and not `0`: the YAML carries its own
    // `:sandbox` default, which is what keeps every existing deployment on
    // the sandbox host without reaching the sender's absent-key safety net.
    expect(apns.environment).toBe('sandbox');
  });

  it('is env-overridable to `production` — the production standup depends on this exact variable name', async () => {
    process.env.APNS_ENVIRONMENT = 'production';
    const factory = await loadConfiguration();

    expect(factory().notifications.push.apns.environment).toBe('production');
  });

  it('passes an unrecognised APNS_ENVIRONMENT through verbatim, so the sender can reject it', async () => {
    process.env.APNS_ENVIRONMENT = 'produciton';
    const factory = await loadConfiguration();

    // The loader must NOT normalise or swallow a bad value; the closed-enum
    // rejection lives in `NativePushSenderService.resolveApnsHost`.
    expect(factory().notifications.push.apns.environment).toBe('produciton');
  });

  it('reads a BLANK APNS_ENVIRONMENT as the number 0 — the quirk the sender rejects rather than defaults', async () => {
    process.env.APNS_ENVIRONMENT = '';
    const factory = await loadConfiguration();

    // `'' ?? 'sandbox'` keeps `''` (nullish coalescing does not fire on an
    // empty string), then `!isNaN('')` turns it into `Number('')`. Asserted
    // here so the sender's rejection of `0` is anchored to real loader
    // behaviour rather than to a guess about it.
    expect(factory().notifications.push.apns.environment).toBe(0 as any);
  });
});
