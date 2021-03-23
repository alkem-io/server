import { createUnionType } from '@nestjs/graphql';
import { Organisation } from '@domain/community/organisation/organisation.entity';
import { Community } from '../community';

export const UserGroupParent = createUnionType({
  name: 'UserGroupParent',
  types: () => [Community, Organisation],
});
