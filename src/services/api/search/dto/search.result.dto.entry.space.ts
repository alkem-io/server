import { ISpace } from '@domain/challenge/space/space.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultBase } from './search.result.dto.entry.base.interface';
import { ISearchResult } from './search.result.entry.interface';

@ObjectType('SearchResultSpace', {
  implements: () => [ISearchResult],
})
export abstract class ISearchResultSpace
  extends ISearchResultBase
  implements ISearchResult
{
  @Field(() => ISpace, {
    nullable: false,
    description: 'The Space that was found.',
  })
  space!: ISpace;
}
