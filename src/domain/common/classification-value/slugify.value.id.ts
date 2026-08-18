import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import {
  CLASSIFICATION_VALUE_ID_MAX_LENGTH,
  CLASSIFICATION_VALUE_SET_MAX_SIZE,
} from './classification.value.interface';

// One value as authored, before id derivation: an explicit id overrides
// derivation from the label; omitting it means "slugify the label" (FR-002c).
export interface AuthoredClassificationValue {
  id?: string | null;
  label: string;
}

export interface DerivedClassificationValue {
  id: string;
  label: string;
}

/**
 * NFKD-normalize, fold diacritics, lowercase, collapse any run of
 * non-alphanumeric characters to a single hyphen, and trim leading/trailing
 * hyphens. Deterministic and pure — the same label always slugifies to the
 * same base id.
 *
 * `13 · Climate Action` -> `13-climate-action`
 */
export function slugifyLabel(label: string): string {
  return label
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritical marks
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Deterministic, non-empty fallback for a label with no ASCII alphanumerics
 * once diacritics are folded \u2014 non-Latin scripts (Cyrillic, Greek, CJK,
 * Arabic, \u2026) or punctuation-only labels. `slugifyLabel` alone would collapse
 * every such label to `''`, and a set of them would then collide into the
 * `''`, `-2`, `-3`, \u2026 suffix chain, so this MUST already be non-empty before
 * the suffix loop ever runs. Transliterates every code point to base-36,
 * which is deterministic and per-label distinct for any non-empty input.
 */
function codepointFallback(label: string): string {
  const codepoints = Array.from(label)
    .map(char => char.codePointAt(0)?.toString(36))
    .filter((cp): cp is string => !!cp)
    .join('-');
  return codepoints || 'value';
}

/**
 * Derives (or validates) the stable id for every value in a set, in order.
 * Ids are derived **once, at authoring time** — a value's id is never
 * recomputed from a later label rename, which is why this only ever runs at
 * create/edit time, never on read.
 *
 * - An explicit `id` is taken **verbatim**, subject only to the bounds
 *   below; a collision with another id already in the set (explicit or
 *   derived) is **rejected**, never silently suffixed (FR-002c, I-2).
 * - An omitted `id` is slugified from `label`; a collision with an id
 *   already in the set is resolved deterministically by appending `-2`,
 *   `-3`, … until unique.
 *
 * Throws {@link ValidationException} on an empty/over-length explicit id, an
 * explicit-id collision, or an input longer than the I-1 value-set size
 * bound. The size check runs FIRST, before any derivation work: this
 * function is reachable from callers that validate the 1–50 bound only
 * afterward (classification.entry.validator.ts / the template-side I-9), and
 * the collision-suffix loop below is quadratic in the size of the input, so
 * an unbounded caller-supplied array must never reach it — defence in depth
 * against a request that skips DTO validation entirely, not just the
 * ordinary 1–50 domain rule.
 */
export function deriveClassificationValueIds(
  values: AuthoredClassificationValue[]
): DerivedClassificationValue[] {
  if (values.length > CLASSIFICATION_VALUE_SET_MAX_SIZE) {
    throw new ValidationException(
      `A Classification value set must contain at most ${CLASSIFICATION_VALUE_SET_MAX_SIZE} values`,
      LogContext.CLASSIFICATION,
      { size: values.length }
    );
  }

  const usedIds = new Set<string>();
  // Per-base pointer to the next untried numeric suffix, so a run of
  // identically-labelled values allocates in O(1) amortized per value
  // instead of re-probing from `-2` every time (which is what made the
  // suffix loop quadratic before the size bound above existed).
  const nextSuffixByBase = new Map<string, number>();
  const derived: DerivedClassificationValue[] = [];

  for (const value of values) {
    const explicit = value.id?.trim();
    let id: string;

    if (explicit) {
      if (explicit.length > CLASSIFICATION_VALUE_ID_MAX_LENGTH) {
        throw new ValidationException(
          'Classification value id override exceeds the maximum length',
          LogContext.CLASSIFICATION,
          { id: explicit }
        );
      }
      if (usedIds.has(explicit)) {
        throw new ValidationException(
          'Classification value id override collides with another value in the same set',
          LogContext.CLASSIFICATION,
          { id: explicit }
        );
      }
      id = explicit;
    } else {
      // Fall back to a codepoint transliteration when the label carries no
      // ASCII alphanumerics (non-Latin scripts, punctuation-only labels) —
      // slugifyLabel alone would yield '' here, and a stored id must never
      // be empty.
      const base = slugifyLabel(value.label) || codepointFallback(value.label);
      if (!usedIds.has(base) && !nextSuffixByBase.has(base)) {
        id = base;
      } else {
        let suffix = nextSuffixByBase.get(base) ?? 2;
        id = `${base}-${suffix}`;
        // Only iterates when an explicit id elsewhere in the set already
        // claimed the guessed suffix — not attacker-controlled by input
        // size, since the pointer above already skips every suffix this
        // function itself has allocated.
        while (usedIds.has(id)) {
          suffix++;
          id = `${base}-${suffix}`;
        }
        nextSuffixByBase.set(base, suffix + 1);
      }
    }

    // Defence in depth: no branch above should ever produce an empty id
    // (an empty explicit id falls through to the derive branch above,
    // never taking the `explicit` branch), but an empty, unaggregable id
    // must never reach storage regardless of how it was produced.
    if (!id) {
      throw new ValidationException(
        'Classification value id derivation produced an empty id',
        LogContext.CLASSIFICATION,
        { label: value.label }
      );
    }

    usedIds.add(id);
    derived.push({ id, label: value.label });
  }

  return derived;
}

/**
 * Definition-edit variant of {@link deriveClassificationValueIds}: a value's
 * stable id is derived once, at authoring time, and a later relabel MUST NOT
 * change it — even when the client omits the id on the edit call rather than
 * echoing it back. Reorder and removal are both permitted edits (FR-012b)
 * and MUST NOT reassign an id to the wrong label.
 *
 * Before delegating to the ordinary derivation, every id-less incoming value
 * is resolved to an existing id in two passes:
 *
 * 1. **Label match** — an id-less value is matched against an as-yet-unclaimed
 *    existing value with the exact same label, in encounter order. This is
 *    what makes reorder and removal safe: the id follows the label, not the
 *    position.
 * 2. **Positional fallback** — anything still unresolved after pass 1 is
 *    matched against the existing value at the same index, but only if that
 *    existing value hasn't already been claimed by pass 1 (which would mean
 *    its label survives elsewhere in the incoming set — a reorder, not a
 *    rename). This is what carries a genuine rename forward: the label
 *    changed, so pass 1 can't match it, but the position still identifies it.
 *
 * Anything unresolved after both passes is a genuinely new value and is
 * slugified from its label. An explicit id on the incoming value always
 * wins over both passes, exactly as in {@link deriveClassificationValueIds}.
 */
export function deriveClassificationValueIdsForEdit(
  existingValueSet: DerivedClassificationValue[],
  values: AuthoredClassificationValue[]
): DerivedClassificationValue[] {
  // Same defence-in-depth bound as deriveClassificationValueIds, checked
  // here too rather than relying solely on the delegation below — the
  // label-matching passes below are their own O(n) work over a
  // caller-supplied array before that delegation ever runs.
  if (values.length > CLASSIFICATION_VALUE_SET_MAX_SIZE) {
    throw new ValidationException(
      `A Classification value set must contain at most ${CLASSIFICATION_VALUE_SET_MAX_SIZE} values`,
      LogContext.CLASSIFICATION,
      { size: values.length }
    );
  }

  const existingByLabel = new Map<string, DerivedClassificationValue[]>();
  for (const existing of existingValueSet) {
    const bucket = existingByLabel.get(existing.label);
    if (bucket) {
      bucket.push(existing);
    } else {
      existingByLabel.set(existing.label, [existing]);
    }
  }

  const claimedExistingIds = new Set<string>();

  // Pass 1: label match. `undefined` means "still unresolved" — index-aligned
  // with `values` so pass 2 can fall back positionally.
  const labelMatched: (AuthoredClassificationValue | undefined)[] = values.map(
    value => {
      if (value.id?.trim()) {
        return value;
      }
      const candidates = existingByLabel.get(value.label);
      const match = candidates?.find(
        candidate => !claimedExistingIds.has(candidate.id)
      );
      if (!match) {
        return undefined;
      }
      claimedExistingIds.add(match.id);
      return { ...value, id: match.id };
    }
  );

  // Pass 2: positional fallback for the pure-rename case — only when the
  // existing value at this index wasn't already claimed by a label match
  // elsewhere in the incoming set.
  const withCarriedIds: AuthoredClassificationValue[] = labelMatched.map(
    (resolved, index) => {
      if (resolved) {
        return resolved;
      }
      const value = values[index];
      const existing = existingValueSet[index];
      if (existing && !claimedExistingIds.has(existing.id)) {
        claimedExistingIds.add(existing.id);
        return { ...value, id: existing.id };
      }
      return value;
    }
  );

  return deriveClassificationValueIds(withCarriedIds);
}
