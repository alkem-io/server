import { createUnionType } from '@nestjs/graphql';
import { Ecoverse } from '../ecoverse/ecoverse.entity';
import { Challenge } from '../challenge/challenge.entity';
import { Opportunity } from '../opportunity/opportunity.entity';
import { Organisation } from '../organisation/organisation.entity';

export const UserGroupParent = createUnionType({
  name: 'UserGroupParent',
  types: () => [Ecoverse, Challenge, Opportunity, Organisation],
});
