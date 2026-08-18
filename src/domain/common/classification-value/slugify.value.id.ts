import { LogContext } from '@common/enums/logging.context';
import { ValidationException } from '@common/exceptions';
import { CLASSIFICATION_VALUE_ID_MAX_LENGTH } from './classification.value.interface';

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
 * Throws {@link ValidationException} on an empty/over-length explicit id or
 * an explicit-id collision. Does **not** enforce the 1–50 value-set size
 * bound (I-1) — that is the caller's job (classification.entry.validator.ts
 * / the template-side I-9), since this function only derives ids.
 */
export function deriveClassificationValueIds(
  values: AuthoredClassificationValue[]
): DerivedClassificationValue[] {
  const usedIds = new Set<string>();
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
      id = base;
      let suffix = 2;
      while (usedIds.has(id)) {
        id = `${base}-${suffix}`;
        suffix++;
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
 * echoing it back.
 * Before delegating to the ordinary derivation, an id-less incoming value is
 * matched **positionally** against `existingValueSet` and has the existing
 * id carried forward verbatim; only a value beyond the previous length (a
 * genuinely new addition) is slugified from its label. An explicit id on the
 * incoming value always wins, exactly as in {@link deriveClassificationValueIds}.
 */
export function deriveClassificationValueIdsForEdit(
  existingValueSet: DerivedClassificationValue[],
  values: AuthoredClassificationValue[]
): DerivedClassificationValue[] {
  const withCarriedIds: AuthoredClassificationValue[] = values.map(
    (value, index) => {
      if (value.id?.trim()) {
        return value;
      }
      const existing = existingValueSet[index];
      return existing ? { ...value, id: existing.id } : value;
    }
  );
  return deriveClassificationValueIds(withCarriedIds);
}
