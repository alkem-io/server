import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { vi } from 'vitest';
import { performOverrideEvaluationAsync } from '../../src/tools/schema/override';

// Simulates GitHub review fetch fallback by mocking global fetch.

describe('override evaluation via GitHub fetch fallback', () => {
  let tmpDir: string;
  const origEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'override-fetch-'));
    origEnv.SCHEMA_OVERRIDE_GITHUB_TOKEN =
      process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN;
    origEnv.SCHEMA_OVERRIDE_REPO = process.env.SCHEMA_OVERRIDE_REPO;
    origEnv.SCHEMA_OVERRIDE_PR_NUMBER = process.env.SCHEMA_OVERRIDE_PR_NUMBER;
    origEnv.SCHEMA_OVERRIDE_CODEOWNERS_PATH =
      process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH;

    const codeownersPath = join(tmpDir, 'CODEOWNERS');
    writeFileSync(codeownersPath, '* @alice');
    process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH = codeownersPath;
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
    for (const [key, val] of Object.entries(origEnv)) {
      if (val === undefined) delete process.env[key];
      else process.env[key] = val;
    }
    vi.restoreAllMocks();
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
