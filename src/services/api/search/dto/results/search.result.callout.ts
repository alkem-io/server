import { Field, ObjectType } from '@nestjs/graphql';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { ISpace } from '@domain/space/space/space.interface';
import { ISearchResult } from './search.result.interface';
import { SearchResultBase } from './search.result.base';

@ObjectType('SearchResultCallout', {
  implements: () => ISearchResult,
})
export abstract class ISearchResultCallout extends SearchResultBase() {
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
