import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { applyFilteringOnWhereExpression } from '../filter.fn.where.expression';
import { UserFilterInput } from '../input-types';

export const applyUserFilter = <T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  filter: UserFilterInput,
  bindOperator: 'and' | 'or' = 'and'
) => {
  const filterKeys = Object.keys(filter);

  if (!filterKeys.length) {
    return query;
  }

  const { displayName, ...rest } = filter;
  const hasWhere = query.expressionMap.wheres?.length > 0;
  // A and ((b or c) or d)
  query[hasWhere ? (bindOperator === 'and' ? 'andWhere' : 'orWhere') : 'where'](
    new Brackets(wqb => {
      applyFilteringOnWhereExpression(wqb, rest);

      if (displayName) {
        const hasRest = Object.keys(rest).length > 0;
        query.leftJoin('user.profile', 'profile');
        // Use the table-qualified column directly instead of alias (PostgreSQL requires quoted identifiers)
        wqb[hasRest ? 'orWhere' : 'where'](
          `"profile"."displayName" LIKE '%${displayName}%'`
        );
      }
    })
  );
};
