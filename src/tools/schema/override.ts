// Override evaluation utility for FR-003
// Responsibilities:
// 1. Parse CODEOWNERS file to extract owner identifiers (usernames or team slugs)
// 2. Evaluate provided review metadata for presence of approval phrase BREAKING-APPROVED
// 3. Confirm reviewer matches an owner (simple username match for now; team expansion TBD)
// 4. Return evaluation result consumed by diff-schema tool
//
// Note: Actual GitHub API fetching is out of scope here; we rely on environment-provided JSON to keep
// the tool self-contained for local + CI usage. CI workflow can supply reviews via GITHUB_TOKEN script.
//
// Environment Inputs (convention):
//   SCHEMA_OVERRIDE_CODEOWNERS_PATH (default: CODEOWNERS in repo root)
//   SCHEMA_OVERRIDE_REVIEWS_JSON (optional inline JSON string of reviews)
//   SCHEMA_OVERRIDE_REVIEWS_FILE (alternative path to JSON file with reviews)
// JSON Review shape expected:
//   [{ reviewer: "login", body: "text body", state: "APPROVED" }, ...]
//
// Output interface: OverrideEvaluation
//   { applied: boolean; reviewer?: string; reason?: string; owners: string[]; details: string[] }
//
// Limitations / Future Enhancements:
// - Team (@org/team) expansion not implemented.
// - Distinguish multiple approvals; select first valid.
// - Collect per-entry override marking (currently aggregated at report level).

import { readFileSync, existsSync } from 'node:fs';
import { fetchGitHubReviews } from './override-fetch';

export interface ReviewInput {
  reviewer: string;
  body: string;
  state?: string; // APPROVED etc
}

export interface OverrideEvaluation {
  applied: boolean;
  reviewer?: string;
  reason?: string;
  owners: string[];
  details: string[];
}

const APPROVAL_PHRASE = 'BREAKING-APPROVED';

export function parseCodeOwners(path = 'CODEOWNERS'): string[] {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, 'utf-8');
  const owners = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    // Strip inline comments so words after '#' are not treated as owners
    let content = trimmed;
    const hashIndex = content.indexOf('#');
    if (hashIndex !== -1) {
      content = content.substring(0, hashIndex).trim();
    }
    if (!content) continue;
    // Format: pattern owner1 owner2
    const parts = content.split(/\s+/).slice(1); // skip pattern
    for (const p of parts) {
      if (!p) continue;
      // Strip leading @ if present
      const norm = p.startsWith('@') ? p.substring(1) : p;
      owners.add(norm);
    }
  }
  return Array.from(owners);
}

export function loadReviewsFromEnv(): ReviewInput[] {
  const details: ReviewInput[] = [];
  const inline = process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
  const file = process.env.SCHEMA_OVERRIDE_REVIEWS_FILE;
  try {
    if (inline) {
      const parsed = JSON.parse(inline);
      if (Array.isArray(parsed)) return parsed as ReviewInput[];
    }
    if (file && existsSync(file)) {
      const raw = readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as ReviewInput[];
    }
  } catch {
    // swallow; evaluation will fail gracefully
  }
  return details;
}

export function evaluateOverride(
  owners: string[],
  reviews: ReviewInput[]
): OverrideEvaluation {
  const ev: OverrideEvaluation = {
    applied: false,
    owners,
    details: [],
  };
  if (!owners.length) {
    ev.details.push('No CODEOWNERS entries found');
    return ev;
  }
  if (!reviews.length) {
    ev.details.push('No reviews provided');
    return ev;
  }
  for (const r of reviews) {
    const reviewer = r.reviewer?.toLowerCase();
    if (!reviewer) continue;
    const isOwner = owners.map(o => o.toLowerCase()).includes(reviewer);
    const hasPhrase = (r.body || '').includes(APPROVAL_PHRASE);
    const approvedState = !r.state || r.state === 'APPROVED';
    ev.details.push(
      `Review by ${r.reviewer}: owner=${isOwner} phrase=${hasPhrase} state=${r.state}`
    );
    if (isOwner && hasPhrase && approvedState) {
      ev.applied = true;
      ev.reviewer = r.reviewer;
      ev.reason = 'Owner approval with phrase';
      return ev;
    }
  }
  ev.details.push('No qualifying review found');
  return ev;
}

// Internal async version (exported for tests to avoid brittle busy-waiting)
export async function performOverrideEvaluationAsync(): Promise<OverrideEvaluation> {
  const owners = parseCodeOwners(
    process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH || 'CODEOWNERS'
  );
  let reviews = loadReviewsFromEnv();
  if (!reviews.length) {
    reviews = await fetchGitHubReviews();
  }
  return evaluateOverride(owners, reviews);
}

// Backwards compatible sync wrapper used by CLI code paths. It will attempt env reviews first;
// if network fetch is needed it performs a short timed wait on the async function (<=3s) but
// test code should prefer performOverrideEvaluationAsync for determinism.
// Synchronous-only evaluation used by CLI and other sync callers.
// Important: this function will NOT perform any network fetches. It only
// consumes reviews provided via environment variables (`SCHEMA_OVERRIDE_REVIEWS_JSON`
// or `SCHEMA_OVERRIDE_REVIEWS_FILE`). If you need to fetch reviews from the
// network (e.g. GitHub API), call `performOverrideEvaluationAsync()` instead.
export function performOverrideEvaluation(): OverrideEvaluation {
  const owners = parseCodeOwners(
    process.env.SCHEMA_OVERRIDE_CODEOWNERS_PATH || 'CODEOWNERS'
  );
  const reviews = loadReviewsFromEnv();
  if (!reviews.length) {
    return {
      applied: false,
      owners,
      details: [
        'No reviews provided via environment. Use performOverrideEvaluationAsync() to fetch reviews from network when needed',
      ],
    };
  }
  return evaluateOverride(owners, reviews);
}
