import { createUnionType } from '@nestjs/graphql';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { Challenge } from '@domain/challenge/challenge/challenge.entity';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { Organisation } from '@domain/community/organisation/organisation.entity';

export const UserGroupParent = createUnionType({
  name: 'UserGroupParent',
  types: () => [Ecoverse, Challenge, Opportunity, Organisation],
});
