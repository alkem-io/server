import { ActorType } from '@common/enums/actor.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ITagset } from '@domain/common/tagset/tagset.interface';

// Pure, side-effect-free helpers for the contributor-card enrichment fields
// (tagline, tags, joinedDate, website). No Nest DI, no I/O — every value they
// need is passed in by the caller, which is what makes them cheap to unit
// test exhaustively without a database.

type TagsetLike = Pick<ITagset, 'name' | 'tags'>;

// Per-type preference order for the "first non-empty tagset wins" rule.
// `default`, `flow-state` and `task` are never candidates.
const TAG_PREFERENCE_ORDER: Partial<Record<ActorType, TagsetReservedName[]>> = {
  [ActorType.USER]: [TagsetReservedName.SKILLS, TagsetReservedName.KEYWORDS],
  [ActorType.ORGANIZATION]: [
    TagsetReservedName.KEYWORDS,
    TagsetReservedName.CAPABILITIES,
  ],
  [ActorType.VIRTUAL_CONTRIBUTOR]: [
    TagsetReservedName.KEYWORDS,
    TagsetReservedName.CAPABILITIES,
  ],
};

/**
 * Trim the profile tagline; undefined for null, empty or whitespace-only.
 */
export function normalizeTagline(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * The full tag list of the first non-empty tagset in the per-type preference
 * order. A tagset is "non-empty" once its blank tags are dropped; blank-only
 * (or no) tags moves on to the next candidate name. Never merges across
 * tagsets, never falls back to the default tagset, and applies no cap.
 */
export function pickContributorTags(
  type: ActorType,
  tagsets: TagsetLike[]
): string[] {
  const order = TAG_PREFERENCE_ORDER[type];
  if (!order) {
    return [];
  }
  for (const name of order) {
    const tagset = tagsets.find(t => t.name === name);
    if (!tagset) {
      continue;
    }
    const nonBlank = tagset.tags.filter(tag => tag.trim().length > 0);
    if (nonBlank.length > 0) {
      return nonBlank;
    }
  }
  return [];
}

/**
 * Truncate a date to the first day of its UTC month, at 00:00:00.000 UTC.
 */
export function truncateToMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

/**
 * Trim the stored website value; undefined when empty or when it does not
 * parse as an absolute http/https URL. The trimmed stored string is returned
 * unchanged otherwise — never `url.href`, and no scheme is ever guessed for a
 * schemeless value.
 */
export function normalizeWebsite(value?: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return undefined;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return undefined;
  }
  return trimmed;
}
