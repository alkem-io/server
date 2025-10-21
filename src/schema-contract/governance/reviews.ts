/** Reviews ingestion utility (T027)
 * Supports reading review metadata from environment variables or a JSON file.
 * Shape: [{ reviewer: string; body: string; state?: string }]
 */
import { readFileSync, existsSync } from 'node:fs';

export interface ReviewRecord {
  reviewer: string;
  body: string;
  state?: string; // APPROVED etc
}

function isValidReviewArray(v: unknown): v is ReviewRecord[] {
  if (!Array.isArray(v)) return false;
  return v.every(item => {
    if (!item || typeof item !== 'object') return false;
    const it: any = item as any;
    if (typeof it.reviewer !== 'string') return false;
    if (typeof it.body !== 'string') return false;
    if (it.state !== undefined && typeof it.state !== 'string') return false;
    return true;
  });
}

export function loadReviews(): ReviewRecord[] {
  // Priority: inline JSON, file path, else empty
  const inline = process.env.SCHEMA_OVERRIDE_REVIEWS_JSON;
  if (inline) {
    try {
      const parsed = JSON.parse(inline);
      if (isValidReviewArray(parsed)) return parsed;
      // parsed value not in expected shape
      // eslint-disable-next-line no-console
      console.warn('SCHEMA_OVERRIDE_REVIEWS_JSON ignored: invalid structure');
    } catch {
      // ignore
    }
  }
  const file = process.env.SCHEMA_OVERRIDE_REVIEWS_FILE;
  if (file && existsSync(file)) {
    try {
      const raw = readFileSync(file, 'utf-8');
      const parsed = JSON.parse(raw);
      if (isValidReviewArray(parsed)) return parsed;
      // eslint-disable-next-line no-console
      console.warn(
        `SCHEMA_OVERRIDE_REVIEWS_FILE ${file} ignored: invalid structure`
      );
    } catch {
      // ignore
    }
  }
  return [];
}

export const APPROVAL_PHRASE = 'BREAKING-APPROVED';

export interface OverrideCheck {
  applied: boolean;
  reviewer?: string;
  details: string[];
}

export function evaluateOverride(
  owners: string[],
  reviews: ReviewRecord[]
): OverrideCheck {
  const details: string[] = [];
  if (!owners.length) {
    details.push('No CODEOWNERS owners resolved');
    return { applied: false, details };
  }
  if (!reviews.length) {
    details.push('No reviews provided');
    return { applied: false, details };
  }
  const ownerSet = new Set(owners.map(o => o.toLowerCase()));
  for (const r of reviews) {
    const reviewer = r.reviewer?.toLowerCase();
    const phrase = (r.body || '').toUpperCase().includes(APPROVAL_PHRASE);
    const isOwner = reviewer && ownerSet.has(reviewer);
    const approved = !r.state || r.state === 'APPROVED';
    details.push(
      `Review ${r.reviewer} owner=${isOwner} phrase=${phrase} state=${r.state}`
    );
    if (isOwner && phrase && approved) {
      return { applied: true, reviewer: r.reviewer, details };
    }
  }
  details.push('No qualifying review found');
  return { applied: false, details };
}
