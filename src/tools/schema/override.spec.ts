import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as overrideFetchModule from './override-fetch';
import {
  evaluateOverride,
  loadReviewsFromEnv,
  parseCodeOwners,
  performOverrideEvaluation,
  performOverrideEvaluationAsync,
} from './override';

// Use real temp files instead of mocking node:fs (incompatible with isolate: false)
let tmpDir: string;

beforeEach(() => {
  vi.restoreAllMocks();
  tmpDir = mkdtempSync(join(tmpdir(), 'override-test-'));
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('parseCodeOwners', () => {
  it('returns empty array when file does not exist', () => {
    expect(parseCodeOwners(join(tmpDir, 'nonexistent'))).toEqual([]);
  });

  it('skips comment lines and blank lines', () => {
    const path = join(tmpDir, 'CODEOWNERS');
    writeFileSync(path, '# This is a comment\n\n* @alice\n');
    const owners = parseCodeOwners(path);
    expect(owners).toEqual(['alice']);
  });

  it('extracts multiple owners and strips @ prefix', () => {
    const path = join(tmpDir, 'CODEOWNERS');
    writeFileSync(path, '*.graphql @alice @org/team @bob\n');
    const owners = parseCodeOwners(path);
    expect(owners).toContain('alice');
    expect(owners).toContain('org/team');
    expect(owners).toContain('bob');
  });

  it('strips inline comments', () => {
    const path = join(tmpDir, 'CODEOWNERS');
    writeFileSync(path, '*.ts @alice # schema owners\n');
    const owners = parseCodeOwners(path);
    expect(owners).toEqual(['alice']);
    expect(owners).not.toContain('schema');
  });

  it('deduplicates owners across multiple lines', () => {
    const path = join(tmpDir, 'CODEOWNERS');
    writeFileSync(path, '*.ts @alice @bob\n*.js @alice @charlie\n');
    const owners = parseCodeOwners(path);
    const aliceCount = owners.filter(o => o === 'alice').length;
    expect(aliceCount).toBe(1);
    expect(owners).toContain('bob');
    expect(owners).toContain('charlie');
  });
});

describe('loadReviewsFromEnv', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('returns empty array when no env vars set', () => {
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_FILE;
    expect(loadReviewsFromEnv()).toEqual([]);
  });

  it('parses inline JSON from SCHEMA_OVERRIDE_REVIEWS_JSON', () => {
    process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = JSON.stringify([
      { reviewer: 'alice', body: 'BREAKING-APPROVED', state: 'APPROVED' },
    ]);
    const reviews = loadReviewsFromEnv();
    expect(reviews).toHaveLength(1);
    expect(reviews[0].reviewer).toBe('alice');
  });

  it('reads from file when SCHEMA_OVERRIDE_REVIEWS_FILE is set', () => {
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
    const filePath = join(tmpDir, 'reviews.json');
    writeFileSync(
      filePath,
      JSON.stringify([{ reviewer: 'bob', body: 'ok', state: 'APPROVED' }])
    );
    process.env.SCHEMA_OVERRIDE_REVIEWS_FILE = filePath;
    const reviews = loadReviewsFromEnv();
    expect(reviews).toHaveLength(1);
    expect(reviews[0].reviewer).toBe('bob');
  });

  it('returns empty array on invalid JSON', () => {
    process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = 'not-json';
    expect(loadReviewsFromEnv()).toEqual([]);
  });

  it('returns empty array when inline JSON is not an array', () => {
    process.env.SCHEMA_OVERRIDE_REVIEWS_JSON = JSON.stringify({
      reviewer: 'alice',
    });
    expect(loadReviewsFromEnv()).toEqual([]);
  });
});

describe('evaluateOverride', () => {
  it('returns not applied when no owners', () => {
    const result = evaluateOverride([], [
      { reviewer: 'alice', body: 'BREAKING-APPROVED' },
    ]);
    expect(result.applied).toBe(false);
    expect(result.details).toContain('No CODEOWNERS entries found');
  });

  it('returns not applied when no reviews', () => {
    const result = evaluateOverride(['alice'], []);
    expect(result.applied).toBe(false);
    expect(result.details).toContain('No reviews provided');
  });

  it('applies override when owner approves with BREAKING-APPROVED phrase', () => {
    const result = evaluateOverride(['alice'], [
      { reviewer: 'alice', body: 'LGTM BREAKING-APPROVED', state: 'APPROVED' },
    ]);
    expect(result.applied).toBe(true);
    expect(result.reviewer).toBe('alice');
    expect(result.reason).toMatch(/Owner approval/);
  });

  it('rejects when reviewer is not an owner', () => {
    const result = evaluateOverride(['alice'], [
      { reviewer: 'bob', body: 'BREAKING-APPROVED', state: 'APPROVED' },
    ]);
    expect(result.applied).toBe(false);
    expect(result.details).toContain('No qualifying review found');
  });

  it('rejects when owner review lacks BREAKING-APPROVED phrase', () => {
    const result = evaluateOverride(['alice'], [
      { reviewer: 'alice', body: 'looks good', state: 'APPROVED' },
    ]);
    expect(result.applied).toBe(false);
  });

  it('rejects when owner has phrase but state is not APPROVED', () => {
    const result = evaluateOverride(['alice'], [
      {
        reviewer: 'alice',
        body: 'BREAKING-APPROVED',
        state: 'CHANGES_REQUESTED',
      },
    ]);
    expect(result.applied).toBe(false);
  });

  it('is case-insensitive for reviewer matching', () => {
    const result = evaluateOverride(['Alice'], [
      { reviewer: 'alice', body: 'BREAKING-APPROVED', state: 'APPROVED' },
    ]);
    expect(result.applied).toBe(true);
  });

  it('treats missing state as APPROVED (approvedState default)', () => {
    const result = evaluateOverride(['alice'], [
      { reviewer: 'alice', body: 'BREAKING-APPROVED' },
    ]);
    expect(result.applied).toBe(true);
  });

  it('skips reviews with empty reviewer', () => {
    const result = evaluateOverride(['alice'], [
      { reviewer: '', body: 'BREAKING-APPROVED', state: 'APPROVED' },
    ]);
    expect(result.applied).toBe(false);
  });
});

describe('performOverrideEvaluation', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('returns not applied with detail about no reviews when env has none', () => {
    // Point CODEOWNERS to a nonexistent path so existsSync returns false naturally
    process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH = join(tmpDir, 'no-such-file');
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_FILE;
    const result = performOverrideEvaluation();
    expect(result.applied).toBe(false);
    expect(result.details[0]).toMatch(/No reviews provided/);
  });
});

describe('performOverrideEvaluationAsync', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it('falls back to fetchGitHubReviews when no env reviews', async () => {
    process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH = join(tmpDir, 'no-such-file');
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_FILE;

    const fetchSpy = vi.spyOn(overrideFetchModule, 'fetchGitHubReviews')
      .mockResolvedValue([
        { reviewer: 'alice', body: 'BREAKING-APPROVED', state: 'APPROVED' },
      ]);

    // No owners file, so even with reviews from fetch, no owners => not applied
    const result = await performOverrideEvaluationAsync();
    expect(result.applied).toBe(false);
    expect(fetchSpy).toHaveBeenCalled();
  });
});
