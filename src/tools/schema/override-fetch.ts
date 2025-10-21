// GitHub Reviews Fetch Helper (FR-003 tasks 2.2/2.3)
// Attempts to fetch PR reviews via GitHub REST API when environment variables present.
// Environment variables:
//   SCHEMA_OVERRIDE_GITHUB_TOKEN  (required for API call)
//   SCHEMA_OVERRIDE_REPO          (format: owner/name)
//   SCHEMA_OVERRIDE_PR_NUMBER     (PR number)
//   SCHEMA_OVERRIDE_API_URL       (optional base, default https://api.github.com)
// Returns ReviewInput[] compatible with override evaluation.

import { ReviewInput } from './override';

export async function fetchGitHubReviews(): Promise<ReviewInput[]> {
  const token = process.env.SCHEMA_OVERRIDE_GITHUB_TOKEN;
  const repo = process.env.SCHEMA_OVERRIDE_REPO; // owner/name
  const pr = process.env.SCHEMA_OVERRIDE_PR_NUMBER;
  if (!token || !repo || !pr) return [];
  const [owner, name] = repo.split('/');
  if (!owner || !name) return [];
  const base = process.env.SCHEMA_OVERRIDE_API_URL || 'https://api.github.com';
  const url = `${base}/repos/${owner}/${name}/pulls/${pr}/reviews`;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'schema-contract-diff-tool',
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data.map(r => ({
      reviewer: r.user?.login || '',
      body: r.body || '',
      state: r.state || r.author_association || 'APPROVED',
    })) as ReviewInput[];
  } catch {
    return [];
  }
}
