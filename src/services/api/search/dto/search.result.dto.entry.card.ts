import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
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

  @Field(() => String, {
    nullable: false,
    description: 'The Hub nameID of the Card.',
  })
  hub!: string;

  @Field(() => String, {
    nullable: false,
    description: 'The Callout nameID of the Card.',
  })
  callout!: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The Challenge nameID of the Card. Applicable for Callouts on Opportunities and Challenges.',
  })
  challenge?: string;

  @Field(() => String, {
    nullable: true,
    description:
      'The Opportunity nameID of the Card. Applicable only for Callouts on Opportunities.',
  })
  opportunity?: string;
}
