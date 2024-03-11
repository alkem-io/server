import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ISpace } from '@domain/challenge/space/space.interface';
import { IOpportunity } from '@domain/challenge/opportunity/opportunity.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultBase } from './search.result.dto.entry.base.interface';
import { ISearchResult } from './search.result.entry.interface';

@ObjectType('SearchResultOpportunity', {
  implements: () => [ISearchResult],
})
export abstract class ISearchResultOpportunity
  extends ISearchResultBase
  implements ISearchResult
{
  @Field(() => IOpportunity, {
    nullable: false,
    description: 'The Opportunity that was found.',
  })
  opportunity!: IOpportunity;

  @Field(() => ISpace, {
    nullable: false,
    description: 'The Space that the Opportunity is in.',
  })
  space!: ISpace;

  @Field(() => IChallenge, {
    nullable: false,
    description: 'The Challenge that the Opportunity is in.',
  })
  challenge!: IChallenge;
}
