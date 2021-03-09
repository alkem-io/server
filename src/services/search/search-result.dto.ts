import { createUnionType } from '@nestjs/graphql';
import { UserGroup } from '@domain/community/user-group/user-group.entity';
import { User } from '@domain/community/user/user.entity';
import { Organisation } from '@domain/community/organisation/organisation.entity';

export const SearchResult = createUnionType({
  name: 'SearchResult',
  types: () => [User, UserGroup, Organisation],
});
