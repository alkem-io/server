/**
 * Codec for Elasticsearch named-query attribution (feature 010 — matched terms).
 *
 * The query builder names one zero-boost `multi_match` clause per query token via
 * {@link encodeTermName}; Elasticsearch returns the names that matched per hit in
 * `hit.matched_queries`; {@link decodeTermNames} maps those names back to the
 * original query tokens — in query order, de-duplicated case-insensitively.
 *
 * The clause name encodes the token's ordinal position (not the raw token text),
 * which keeps the `_name` collision-safe and decode purely positional: two
 * distinct tokens can never share a name even if they normalize to the same form,
 * and the name carries no characters that could clash with Elasticsearch syntax.
 *
 * See ADR 0001 (search matched-terms attribution).
 */

/**
 * Defensive upper bound on the number of named attribution clauses added per
 * search. Human search boxes hold a handful of words; this cap prevents a
 * pathological query from inflating the `bool.should` clause count. Tokens beyond
 * the cap are dropped from attribution (they still participate in scoring via the
 * untouched `bool.must` clause — only their per-term attribution is omitted).
 */
export const MAX_NAMED_TERMS = 25;

/** Prefix for the encoded `_name`, namespacing it away from any other named clause. */
const TERM_NAME_PREFIX = 'term_';

/**
 * Tokenize a user's raw query string into ordered, as-typed tokens.
 *
 * - Splits on Unicode whitespace.
 * - Preserves the order tokens appeared in the query.
 * - De-duplicates case-insensitively, keeping the first-seen casing/form.
 * - Empty / whitespace-only input yields `[]`.
 *
 * Note: this is a presentation-layer tokenizer (what the user typed), independent
 * of the Elasticsearch search analyzer. Analyzer eligibility (stop-words etc.) is
 * handled by Elasticsearch itself — a token that the analyzer discards simply
 * never appears in `matched_queries`, so it never reaches the decoded result.
 */
export const tokenizeQuery = (query: string): string[] => {
  if (!query) {
    return [];
  }

  const seen = new Set<string>();
  const tokens: string[] = [];

  for (const raw of query.trim().split(/\s+/)) {
    if (!raw) {
      continue;
    }
    const key = raw.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tokens.push(raw);
  }

  return tokens;
};

/**
 * Stable, collision-safe Elasticsearch `_name` for the token at the given ordinal
 * position in the ordered token list. Decoding relies on this being a pure
 * function of the index, so the same `orderedTokens` array used to encode must be
 * passed to {@link decodeTermNames}.
 */
export const encodeTermName = (index: number): string =>
  `${TERM_NAME_PREFIX}${index}`;

/** Inverse of {@link encodeTermName}; returns `undefined` for a foreign name. */
const decodeTermIndex = (name: string): number | undefined => {
  if (!name.startsWith(TERM_NAME_PREFIX)) {
    return undefined;
  }
  const index = Number(name.slice(TERM_NAME_PREFIX.length));
  return Number.isInteger(index) && index >= 0 ? index : undefined;
};

/**
 * Decode the set of matched clause names back into the original query tokens.
 *
 * - Returns the tokens whose names matched, in **query order** (the order of
 *   `orderedTokens`), never in the arbitrary order Elasticsearch reports them.
 * - De-duplicated case-insensitively (already guaranteed by `tokenizeQuery`, but
 *   enforced here too for safety).
 * - Names that do not correspond to a known term index (foreign / out-of-range)
 *   are ignored.
 * - Empty / absent `matchedQueries` yields `[]` — never an error (FR-008).
 */
export const decodeTermNames = (
  matchedQueries: string[] | undefined,
  orderedTokens: string[]
): string[] => {
  if (!matchedQueries || matchedQueries.length === 0) {
    return [];
  }

  const matchedIndices = new Set<number>();
  for (const name of matchedQueries) {
    const index = decodeTermIndex(name);
    if (index !== undefined && index < orderedTokens.length) {
      matchedIndices.add(index);
    }
  }

  const seen = new Set<string>();
  const terms: string[] = [];
  // iterate orderedTokens (query order), not matchedQueries (ES order)
  for (let i = 0; i < orderedTokens.length; i++) {
    if (!matchedIndices.has(i)) {
      continue;
    }
    const token = orderedTokens[i];
    const key = token.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    terms.push(token);
  }

  return terms;
};
