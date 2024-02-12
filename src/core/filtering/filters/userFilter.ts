import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { UserFilterInput } from '../input-types';

export const applyUsersFilter = <T extends ObjectLiteral>(
  query: SelectQueryBuilder<T>,
  filter: UserFilterInput,
  bindOperator: 'and' | 'or' = 'and'
) => {
  const filterKeys = Object.keys(filter);

  if (!filterKeys.length) {
    return query;
  }

  const { displayName, email, firstName, lastName } = filter;

  if (displayName) {
    query.leftJoinAndSelect('user.profile', 'profile');
  }

  const hasWhere =
    query.expressionMap.wheres && query.expressionMap.wheres.length > 0;
  query[!hasWhere ? 'where' : bindOperator ? 'andWhere' : 'orWhere'](
    new Brackets(wqb => {
      if (displayName) wqb.orWhere('profile.displayName like :displayName');
      if (email) wqb.orWhere('email like :email');
      if (firstName) wqb.orWhere('firstName like :firstName');
      if (lastName) wqb.orWhere('lastName like :lastName');
    })
  );

  filterKeys.forEach(key =>
    query.setParameters({ [key]: `%${(filter as any)[key]}%` })
  );
};
