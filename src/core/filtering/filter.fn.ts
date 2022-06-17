import {
  Brackets,
  Like,
  SelectQueryBuilder,
  WhereExpressionBuilder,
} from 'typeorm';

export const applyFiltering = <T>(
  query: SelectQueryBuilder<T>,
  filter: any
) => {
  const filterKeys = Object.keys(filter);

  if (!filterKeys.length) {
    return query;
  }

  // build the filter with WHERE in brackets
  query.andWhere(
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
