import { ISpace } from '@domain/space/space/space.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResult } from './search.result.interface';
import { SearchResultBase } from './search.result.base';

@ObjectType('SearchResultSpace', {
  implements: () => ISearchResult,
})
export abstract class ISearchResultSpace extends SearchResultBase() {
  @Field(() => ISpace, {
    nullable: false,
    description: 'The Space that was found.',
  })
  space!: ISpace;

  @Field(() => ISpace, {
    nullable: true,
    description: 'The parent of this Space, if any.',
  })
  parentSpace?: ISpace;
}
