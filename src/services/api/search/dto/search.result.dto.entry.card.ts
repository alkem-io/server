import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { IHub } from '@domain/challenge/hub/hub.interface';
import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { ICallout } from '@domain/collaboration/callout';
import { IOpportunity } from '@domain/collaboration/opportunity';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultBase } from './search.result.dto.entry.base.interface';
import { ISearchResult } from './search.result.entry.interface';

@ObjectType('SearchResultCard', {
  implements: () => [ISearchResult],
})
export abstract class ISearchResultCard
  extends ISearchResultBase
  implements ISearchResult
{
  @Field(() => IAspect, {
    nullable: false,
    description: 'The Card that was found.',
  })
  card!: IAspect;

  @Field(() => IHub, {
    nullable: false,
    description: 'The Hub of the Card.',
  })
  hub!: IHub;

  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout of the Card.',
  })
  callout!: ICallout;

  @Field(() => IChallenge, {
    nullable: true,
    description:
      'The Challenge of the Card. Applicable for Callouts on Opportunities and Challenges.',
  })
  challenge?: IChallenge;

  @Field(() => IOpportunity, {
    nullable: true,
    description:
      'The Opportunity of the Card. Applicable only for Callouts on Opportunities.',
  })
  opportunity?: IOpportunity;
}
