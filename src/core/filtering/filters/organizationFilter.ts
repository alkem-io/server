import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { applyFilteringOnWhereExpression } from '../filter.fn.where.expression';
import { OrganizationFilterInput } from '../input-types';

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
        query.leftJoin('organization.profile', 'profile');
        // Use parameterized query to prevent SQL injection
        if (hasRest) {
          wqb.orWhere('profile.displayName ILIKE :orgDisplayName', {
            orgDisplayName: `%${displayName}%`,
          });
        } else {
          wqb.where('profile.displayName ILIKE :orgDisplayName', {
            orgDisplayName: `%${displayName}%`,
          });
        }
      }
    })
  );
};
