/**
 * Asserts the in-code default for the organization-invitation support
 * escalation address resolves correctly when the corresponding env var is
 * absent, and that it is env-overridable.
 */

const ORGANIZATION_INVITATION_ENV_VARS = [
  'NOTIFICATIONS_ORGANIZATION_INVITATION_SUPPORT_EMAIL',
] as const;

describe('organization-invitation notifications configuration defaults', () => {
  const origEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    vi.restoreAllMocks();
    for (const key of ORGANIZATION_INVITATION_ENV_VARS) {
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

  it('defaults support_email to support@alkem.io when the env var is absent', async () => {
    const factory = await loadConfiguration();
    const result = factory();
    expect(result.notifications.organization_invitations.support_email).toBe(
      'support@alkem.io'
    );
  });

  it('support_email is env-overridable', async () => {
    process.env.NOTIFICATIONS_ORGANIZATION_INVITATION_SUPPORT_EMAIL =
      'escalations@example.com';
    const factory = await loadConfiguration();
    const result = factory();
    expect(result.notifications.organization_invitations.support_email).toBe(
      'escalations@example.com'
    );
  });
});
