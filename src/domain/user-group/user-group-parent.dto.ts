import { createUnionType } from '@nestjs/graphql';
import { Ecoverse } from '@domain/ecoverse/ecoverse.entity';
import { Challenge } from '@domain/challenge/challenge.entity';
import { Opportunity } from '@domain/opportunity/opportunity.entity';
import { Organisation } from '@domain/organisation/organisation.entity';

export const UserGroupParent = createUnionType({
  name: 'UserGroupParent',
  types: () => [Ecoverse, Challenge, Opportunity, Organisation],
});
