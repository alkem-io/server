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
          // Match the terms in any TEXT field
          // Accumulate the score from all fields - more matches on more fields will result in a higher score
          multi_match: {
            query: terms,
            type: 'most_fields',
            fields: ['*'],
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
