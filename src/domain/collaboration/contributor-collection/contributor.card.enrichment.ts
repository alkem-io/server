import { ActorType } from '@common/enums/actor.type';
import { TagsetReservedName } from '@common/enums/tagset.reserved.name';
import { ITagset } from '@domain/common/tagset/tagset.interface';

// Pure, side-effect-free helpers for the contributor-card enrichment fields
// (tagline, tags, joinedDate, website). No Nest DI, no I/O — every value they
// need is passed in by the caller, which is what makes them cheap to unit
// test exhaustively without a database.

type TagsetLike = Pick<ITagset, 'name' | 'tags'>;

// Per-type order in which tagsets are merged into the card's tag list.
// `default`, `flow-state` and `task` are never included.
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
 * The per-type tagsets merged in preference order, each in stored order. Blank
 * tags are dropped and duplicates — compared trimmed and ignoring case — are
 * kept once, at their first occurrence and with that spelling. Never includes
 * the default tagset, and applies no cap.
 */
export function pickContributorTags(
  type: ActorType,
  tagsets: TagsetLike[]
): string[] {
  const order = TAG_PREFERENCE_ORDER[type];
  if (!order) {
    return [];
  }
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const name of order) {
    const tagset = tagsets.find(t => t.name === name);
    for (const tag of tagset?.tags ?? []) {
      const key = tag.trim().toLowerCase();
      if (key.length === 0 || seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(tag);
    }
  }
  return merged;
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
