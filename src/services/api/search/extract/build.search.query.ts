import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { encodeTermName, MAX_NAMED_TERMS } from './matched.terms.util';

export const buildSearchQuery = (
  terms: string,
  options?: {
    spaceIdFilter?: string;
    flowStateIdFilter?: string;
    /**
     * Ordered, de-duplicated query tokens (see `tokenizeQuery`). One zero-boost
     * named `multi_match` clause is added to `bool.should` per token, enabling
     * matched-terms attribution via `hit.matched_queries` WITHOUT affecting
     * scoring/ranking (boost 0) — feature 010 / ADR 0001.
     */
    attributionTokens?: string[];
  }
): QueryDslQueryContainer => {
  const { spaceIdFilter, flowStateIdFilter, attributionTokens } = options ?? {};
  return {
    bool: {
      must: [
        {
          // Match the terms in any TEXT field
          // Accumulate the score from all fields - more matches on more fields will result in a higher score
          multi_match: {
            query: terms,
            type: 'most_fields',
            fields: ['*'],
          },
        },
      ],
      // Per-token named clauses for matched-terms attribution (ADR 0001).
      // boost: 0 -> they contribute nothing to _score, so ranking is identical
      // to a query without them; they only surface in hit.matched_queries.
      should: buildAttributionClauses(attributionTokens),
      // apply some filters on the results
      filter: buildFilter({
        spaceIdFilter,
        flowStateIdFilter,
      }),
    },
  };
};

/**
 * Build the zero-boost named `multi_match` attribution clauses for `bool.should`.
 * Returns `undefined` when there are no tokens, so the query shape is unchanged
 * for an empty query. Tokens beyond `MAX_NAMED_TERMS` are dropped defensively.
 */
const buildAttributionClauses = (
  attributionTokens?: string[]
): QueryDslQueryContainer[] | undefined => {
  if (!attributionTokens || attributionTokens.length === 0) {
    return undefined;
  }

  return attributionTokens
    .slice(0, MAX_NAMED_TERMS)
    .map<QueryDslQueryContainer>((token, index) => ({
      multi_match: {
        query: token,
        type: 'most_fields',
        // attribute across ALL fields, including deep body content
        // (memo markdown / whiteboard content) — US2 / FR-002
        fields: ['*'],
        // contributes nothing to the score -> ranking invariance (SC-004)
        boost: 0,
        _name: encodeTermName(index),
      },
    }));
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
