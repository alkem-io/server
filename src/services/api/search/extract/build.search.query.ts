import { estypes } from '@elastic/elasticsearch';

export const buildSearchQuery = (
  terms: string,
  options?: {
    spaceIdFilter?: string;
    flowStateIdFilter?: string;
  }
): estypes.QueryDslQueryContainer => {
  const { spaceIdFilter, flowStateIdFilter } = options ?? {};
  return {
    bool: {
      must: [
        {
          // A hit needs to satisfy EITHER of the two text matchers below.
          bool: {
            should: [
              {
                // Exact match across every TEXT field. `most_fields` accumulates
                // score from all fields — more matches on more fields ranks higher.
                // displayName is boosted above the wildcard so a title hit stays
                // a strong signal and large documents keep surfacing by name even
                // when their long `content` field is discounted by BM25 length
                // normalization. `profile.displayName` is mapped `keyword` with a
                // `.text` subfield (alkemio-data-base-fields template) — the boost
                // must target `.text` or it only fires on whole-string matches.
                // `content^0`: content is scored ONCE, by the dedicated fuzzy
                // `match(content)` clause below. Giving it zero weight in this
                // all-fields matcher removes the double-count (all-fields exact +
                // fuzzy) that previously scored every content hit twice and sank
                // tag-only hits to dead-last (M-05). `profile.tags^2` keeps a mild
                // tag boost as before; note a tag-only hit still ranks near/below
                // a content match — forcing it strictly above content was tried
                // (constant_score) and reverted as brittle: absolute scores drift
                // across reindexes on the multi-shard index, so no fixed boost is
                // stable. Tag ≈ content parity is the accepted behaviour (M-05).
                multi_match: {
                  query: terms,
                  type: 'most_fields',
                  fields: [
                    '*',
                    'profile.displayName.text^3',
                    'profile.tags^2',
                    'content^0',
                  ],
                },
              },
              {
                // Typo tolerance, scoped to `content` ONLY. Fuzziness is applied
                // to a single field on purpose: applying it via the all-fields
                // multi_match above (fields:['*']) builds a Levenshtein automaton
                // per field per shard, which on a multi-index search costs
                // seconds of query rewrite. One field keeps rewrite ~10ms.
                // `prefix_length: 2` requires the first two characters to match —
                // it both prunes the automaton (speed) and drops the worst false
                // positives (precision). Exact hits also match the clause above,
                // so a typo-only hit ranks below a clean one.
                match: {
                  content: {
                    query: terms,
                    fuzziness: 'AUTO',
                    prefix_length: 2,
                    max_expansions: 50,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      ],
      // Pure ranking boost (not a matcher): a phrase hit on `content` where the
      // query terms appear close together outranks a document where they are
      // merely scattered across a long body. Lives in the outer `should` so it
      // only re-scores hits already matched by `must` — it never changes which
      // documents are returned. Only `content`-bearing indices (office docs,
      // whiteboards) carry the field, so it is a no-op elsewhere. `slop: 2`
      // tolerates minor word-order/gap variation.
      should: [
        {
          match_phrase: {
            content: {
              query: terms,
              slop: 2,
              boost: 2,
            },
          },
        },
      ],
      // apply some filters on the results
      filter: buildFilter({
        spaceIdFilter,
        flowStateIdFilter,
      }),
    },
  };
};

/**
 * Builds a "field absent OR field equals" should-clause, with
 * `minimum_should_match: 1`. Entities that do not carry the scope field at all
 * (e.g. Spaces never carry `flowStateID`) are kept in the results; entities that
 * do carry it are restricted to the requested value. This mirrors the proven
 * `spaceID` scope filter so global search behaviour is unchanged when the field
 * is omitted.
 */
const buildScopeShouldClause = (
  field: string,
  value: string
): estypes.QueryDslQueryContainer => ({
  bool: {
    // match either of the two conditions
    minimum_should_match: 1,
    should: [
      // the field is not applicable for some entities,
      // so we want them included in the results
      {
        bool: {
          must_not: {
            exists: {
              field,
            },
          },
        },
      },
      // if the field exists, we want to filter by it
      {
        term: {
          [field]: value,
        },
      },
    ],
  },
});

const buildFilter = (opts?: {
  spaceIdFilter?: string;
  flowStateIdFilter?: string;
}): estypes.QueryDslQueryContainer | undefined => {
  const { spaceIdFilter, flowStateIdFilter } = opts ?? {};

  const filters: estypes.QueryDslQueryContainer[] = [];

  if (spaceIdFilter) {
    filters.push(buildScopeShouldClause('spaceID', spaceIdFilter));
  }

  if (flowStateIdFilter) {
    filters.push(buildScopeShouldClause('flowStateID', flowStateIdFilter));
  }

  if (filters.length === 0) {
    return undefined;
  }

  return {
    bool: {
      must: filters,
    },
  };
};
