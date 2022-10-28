import { IHub } from '@domain/challenge/hub/hub.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultBase } from './search.result.dto.entry.base.interface';
import { ISearchResult } from './search.result.entry.interface';

@ObjectType('SearchResultHub', {
  implements: () => [ISearchResult],
})
export abstract class ISearchResultHub
  extends ISearchResultBase
  implements ISearchResult
{
  @Field(() => IHub, {
    nullable: false,
    description: 'The Hub that was found.',
  })
  hub!: IHub;
}
