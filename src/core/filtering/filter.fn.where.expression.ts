import { Like, WhereExpressionBuilder } from 'typeorm';

/***
 * Applies filtering using the where clause builder of an already existing query.
 * Useful when you have custom filters applied beforehand and you want the filters from this function to be applied in the same brackets,
 * or built the same way as the previous filters.
 * @param wqb
 * @param filter
 */
export const applyFilteringOnWhereExpression = (
  wqb: WhereExpressionBuilder,
  filter: Record<string, unknown>
) => {
  const filterKeys = Object.keys(filter);

  if (!filterKeys.length) {
    return wqb;
  }

  filterKeys.forEach(x => addWhereClause(wqb, x, filter[x]));

  return wqb;
};

const addWhereClause = (
  qb: WhereExpressionBuilder,
  fieldName: string,
  value: unknown
) => {
  qb.orWhere({ [fieldName]: Like(`%${value}%`) });
};
