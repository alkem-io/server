import { createUnionType } from '@nestjs/graphql';
import { User } from '@domain/community/user';
import { Organisation } from '@domain/community/organisation';
import { UserGroup } from '@domain/community/user-group';

export const SearchResult = createUnionType({
  name: 'SearchResult',
  types: () => [User, UserGroup, Organisation],
});
