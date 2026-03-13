import { existsSync, readFileSync } from 'node:fs';
import {
  evaluateOverride,
  loadReviewsFromEnv,
  parseCodeOwners,
  performOverrideEvaluation,
  performOverrideEvaluationAsync,
} from './override';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('./override-fetch', () => ({
  fetchGitHubReviews: vi.fn().mockResolvedValue([]),
}));

const mockedExistsSync = vi.mocked(existsSync);
const mockedReadFileSync = vi.mocked(readFileSync);

describe('parseCodeOwners', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty array when file does not exist', () => {
    mockedExistsSync.mockReturnValue(false);
    expect(parseCodeOwners('/nonexistent')).toEqual([]);
  });

  it('skips comment lines and blank lines', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      '# This is a comment\n\n* @alice\n'
    );
    const owners = parseCodeOwners('CODEOWNERS');
    expect(owners).toEqual(['alice']);
  });

  it('extracts multiple owners and strips @ prefix', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      '*.graphql @alice @org/team @bob\n'
    );
    const owners = parseCodeOwners('CODEOWNERS');
    expect(owners).toContain('alice');
    expect(owners).toContain('org/team');
    expect(owners).toContain('bob');
  });

  it('strips inline comments', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      '*.ts @alice # schema owners\n'
    );
    const owners = parseCodeOwners('CODEOWNERS');
    expect(owners).toEqual(['alice']);
    // 'schema' and 'owners' should not appear
    expect(owners).not.toContain('schema');
  });

  it('deduplicates owners across multiple lines', () => {
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      '*.ts @alice @bob\n*.js @alice @charlie\n'
    );
    const owners = parseCodeOwners('CODEOWNERS');
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
    vi.clearAllMocks();
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
    process.env.SCHEMA_OVERRIDE_REVIEWS_FILE = '/tmp/reviews.json';
    mockedExistsSync.mockReturnValue(true);
    mockedReadFileSync.mockReturnValue(
      JSON.stringify([{ reviewer: 'bob', body: 'ok', state: 'APPROVED' }])
    );
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
    vi.clearAllMocks();
  });

  it('returns not applied with detail about no reviews when env has none', () => {
    mockedExistsSync.mockReturnValue(false);
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_FILE;
    delete process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH;
    const result = performOverrideEvaluation();
    expect(result.applied).toBe(false);
    expect(result.details[0]).toMatch(/No reviews provided/);
  });
});

describe('performOverrideEvaluationAsync', () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
    vi.clearAllMocks();
  });

  it('falls back to fetchGitHubReviews when no env reviews', async () => {
    mockedExistsSync.mockReturnValue(false);
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
    delete process.env.SCHEMA_OVERRIDE_REVIEWS_FILE;
    delete process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH;

    const { fetchGitHubReviews } = await import('./override-fetch');
    vi.mocked(fetchGitHubReviews).mockResolvedValue([
      { reviewer: 'alice', body: 'BREAKING-APPROVED', state: 'APPROVED' },
    ]);

    // No owners file, so even with reviews from fetch, no owners => not applied
    const result = await performOverrideEvaluationAsync();
    expect(result.applied).toBe(false);
    expect(fetchGitHubReviews).toHaveBeenCalled();
  });
});
