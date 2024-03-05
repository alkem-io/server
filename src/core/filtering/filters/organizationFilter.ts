import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { OrganizationFilterInput } from '../input-types';
import { applyFilteringOnWhereExpression } from '../filter.fn.where.expression';

export const applyOrganizationFilter = <T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  filter: OrganizationFilterInput,
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
        const alias = 'displayName';
        query
          .leftJoin('organization.profile', 'profile')
          .addSelect('profile.displayName', alias);
        // does not find the alias if an object is used instead
        wqb[hasRest ? 'orWhere' : 'where'](`${alias} LIKE '%${displayName}%'`);
      }
    })
  );
};
