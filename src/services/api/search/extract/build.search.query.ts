import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export const buildSearchQuery = (
  terms: string,
  options?: {
    spaceIdFilter?: string;
    flowStateIdFilter?: string;
  }
): QueryDslQueryContainer => {
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
                multi_match: {
                  query: terms,
                  type: 'most_fields',
                  fields: ['*'],
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
): QueryDslQueryContainer => ({
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
}): QueryDslQueryContainer | undefined => {
  const { spaceIdFilter, flowStateIdFilter } = opts ?? {};

  const filters: QueryDslQueryContainer[] = [];

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
