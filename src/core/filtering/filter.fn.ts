import {
  Brackets,
  Like,
  SelectQueryBuilder,
  WhereExpressionBuilder,
} from 'typeorm';

/***
 * Applies filtering based on fields of T
 * @param query
 * @param filter
 * @param bindOperator Defines weather 'AND' or 'OR' operator is used to bind the filter statement
 * with the other 'WHERE' statements before it in the query.
 * Defaults to 'AND'.
 */
export const applyFiltering = <T>(
  query: SelectQueryBuilder<T>,
  filter: any,
  bindOperator: 'and' | 'or' = 'and'
) => {
  const filterKeys = Object.keys(filter);

  if (!filterKeys.length) {
    return query;
  }

  // build the filter with WHERE in brackets
  query[bindOperator === 'and' ? 'andWhere' : 'orWhere'](
    new Brackets(qb =>
      filterKeys.forEach(x => addWhereClause(qb, x, filter[x]))
    )
  );
};

const addWhereClause = (
  qb: WhereExpressionBuilder,
  fieldName: string,
  value: unknown
) => {
  qb.orWhere({ [fieldName]: Like(`%${value}%`) });
};
