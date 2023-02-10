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
}
