import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { IOpportunity } from '@domain/collaboration/opportunity/opportunity.interface';
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

  @Field(() => IHub, {
    nullable: false,
    description: 'The Hub that the Opportunity is in.',
  })
  hub!: IHub;

  @Field(() => IChallenge, {
    nullable: false,
    description: 'The Challenge that the Opportunity is in.',
  })
  challenge!: IChallenge;
}
