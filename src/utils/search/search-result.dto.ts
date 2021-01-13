import { createUnionType } from '@nestjs/graphql';
import { UserGroup } from '@domain/user-group/user-group.entity';
import { User } from '@domain/user/user.entity';
import { Organisation } from '@domain/organisation/organisation.entity';

export const SearchResult = createUnionType({
  name: 'SearchResult',
  types: () => [User, UserGroup, Organisation],
});
