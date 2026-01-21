import { vi } from 'vitest';
import { performOverrideEvaluationAsync } from '../../src/tools/schema/override';
import * as fs from 'node:fs';

// Simulates GitHub review fetch fallback by mocking global fetch.

describe('override evaluation via GitHub fetch fallback', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
    fs.writeFileSync('CODEOWNERS', '* @alice');
  });

  afterEach(() => {
    process.env = OLD_ENV;
    try {
      fs.unlinkSync('CODEOWNERS');
    } catch {
      /* ignore */
    }
  });

  it('applies override when fetched review contains phrase from owner', async () => {
    process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN = 't';
    process.env.SCHEMA_OVERRIDE_REPO = 'org/repo';
    process.env.SCHEMA_OVERRIDE_PR_NUMBER = '123';

    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          user: { login: 'alice' },
          body: 'LGTM BREAKING-APPROVED',
          state: 'APPROVED',
        },
      ],
    });

    const res = await performOverrideEvaluationAsync();
    expect(res.applied).toBe(true);
    expect(res.reviewer).toBe('alice');
    expect(res.details.some(d => d.includes('owner=true'))).toBe(true);
  });

  it('does not apply override when fetched review lacks phrase', async () => {
    process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN = 't';
    process.env.SCHEMA_OVERRIDE_REPO = 'org/repo';
    process.env.SCHEMA_OVERRIDE_PR_NUMBER = '123';

    (global as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          user: { login: 'alice' },
          body: 'LGTM',
          state: 'APPROVED',
        },
      ],
    });

    const res = await performOverrideEvaluationAsync();
    expect(res.applied).toBe(false);
  });
});
