import { fetchGitHubReviews } from './override-fetch';

describe('fetchGitHubReviews', () => {
  const origEnv = { ...process.env };
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.unstubAllGlobals();
  });

  it('returns empty array when env vars are missing', async () => {
    delete process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN;
    delete process.env.SCHEMA_OVERRIDE_REPO;
    delete process.env.SCHEMA_OVERRIDE_PR_NUMBER;
    const result = await fetchGitHubReviews();
    expect(result).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns empty array when repo format is invalid (no slash)', async () => {
    process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN = 'test-token';
    process.env.SCHEMA_OVERRIDE_REPO = 'invalid-repo';
    process.env.SCHEMA_OVERRIDE_PR_NUMBER = '42';
    const result = await fetchGitHubReviews();
    expect(result).toEqual([]);
  });

  it('fetches and maps reviews on success', async () => {
    process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN = 'test-token';
    process.env.SCHEMA_OVERRIDE_REPO = 'org/repo';
    process.env.SCHEMA_OVERRIDE_PR_NUMBER = '42';
    delete process.env.SCHEMA_OVERRIDE_API_URL;

    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => [
        {
          user: { login: 'alice' },
          body: 'BREAKING-APPROVED',
          state: 'APPROVED',
        },
        {
          user: { login: 'bob' },
          body: 'looks good',
          state: 'COMMENTED',
        },
      ],
    });

    const result = await fetchGitHubReviews();
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      reviewer: 'alice',
      body: 'BREAKING-APPROVED',
      state: 'APPROVED',
    });
    expect(result[1]).toEqual({
      reviewer: 'bob',
      body: 'looks good',
      state: 'COMMENTED',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/org/repo/pulls/42/reviews',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-token',
        }),
      })
    );
  });

  it('uses custom API URL when provided', async () => {
    process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN = 'test-token';
    process.env.SCHEMA_OVERRIDE_REPO = 'org/repo';
    process.env.SCHEMA_OVERRIDE_PR_NUMBER = '42';
    process.env.SCHEMA_OVERRIDE_API_URL = 'https://custom.api.com';

    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    await fetchGitHubReviews();
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://custom.api.com/repos/org/repo/pulls/42/reviews',
      expect.any(Object)
    );
  });

  it('returns empty array on non-ok response', async () => {
    process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN = 'test-token';
    process.env.SCHEMA_OVERRIDE_REPO = 'org/repo';
    process.env.SCHEMA_OVERRIDE_PR_NUMBER = '42';

    fetchSpy.mockResolvedValue({
      ok: false,
      status: 403,
    });

    const result = await fetchGitHubReviews();
    expect(result).toEqual([]);
  });

  it('returns empty array when response is not an array', async () => {
    process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN = 'test-token';
    process.env.SCHEMA_OVERRIDE_REPO = 'org/repo';
    process.env.SCHEMA_OVERRIDE_PR_NUMBER = '42';

    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'not an array' }),
    });

    const result = await fetchGitHubReviews();
    expect(result).toEqual([]);
  });

  it('returns empty array on fetch error', async () => {
    process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN = 'test-token';
    process.env.SCHEMA_OVERRIDE_REPO = 'org/repo';
    process.env.SCHEMA_OVERRIDE_PR_NUMBER = '42';

    fetchSpy.mockRejectedValue(new Error('Network error'));

    const result = await fetchGitHubReviews();
    expect(result).toEqual([]);
  });

  it('handles missing user login gracefully', async () => {
    process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN = 'test-token';
    process.env.SCHEMA_OVERRIDE_REPO = 'org/repo';
    process.env.SCHEMA_OVERRIDE_PR_NUMBER = '42';

    fetchSpy.mockResolvedValue({
      ok: true,
      json: async () => [
        { user: null, body: 'text', state: 'APPROVED' },
        { body: 'no user field', state: 'APPROVED' },
      ],
    });

    const result = await fetchGitHubReviews();
    expect(result).toHaveLength(2);
    expect(result[0].reviewer).toBe('');
    expect(result[1].reviewer).toBe('');
  });
});
