import { ISpace } from '@domain/space/space/space.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { SearchResultBase } from './search.result.base';
import { ISearchResult } from './search.result.interface';

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
