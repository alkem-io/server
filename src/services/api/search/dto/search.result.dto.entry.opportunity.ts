import { ISpace } from '@domain/space/space/space.interface';
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
  @Field(() => ISpace, {
    nullable: false,
    description: 'The Opportunity that was found.',
  })
  opportunity!: ISpace;

  @Field(() => ISpace, {
    nullable: false,
    description: 'The Space that the Opportunity is in.',
  })
  space!: ISpace;

  @Field(() => ISpace, {
    nullable: false,
    description: 'The Challenge that the Opportunity is in.',
  })
  subspace!: ISpace;
}
