import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultBase } from './search.result.dto.entry.base.interface';
import { ISearchResult } from './search.result.entry.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ISpace } from '@domain/space/space/space.interface';

@ObjectType('SearchResultCallout', {
  implements: () => [ISearchResult],
})
export abstract class ISearchResultCallout
  extends ISearchResultBase
  implements ISearchResult
{
  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout that was found.',
  })
  callout!: ICallout;

  @Field(() => ISpace, {
    nullable: false,
    description: 'The parent Space of the Callout.',
  })
  space!: ISpace;
}
