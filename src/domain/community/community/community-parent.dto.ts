import { createUnionType } from '@nestjs/graphql';
import { Ecoverse } from '@domain/challenge/ecoverse/ecoverse.entity';
import { Opportunity } from '@domain/challenge/opportunity/opportunity.entity';
import { Challenge } from '@domain/challenge';

export const CommunityParent = createUnionType({
  name: 'CommunityParent',
  types: () => [Ecoverse, Opportunity, Challenge],
});
