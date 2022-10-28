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
}
