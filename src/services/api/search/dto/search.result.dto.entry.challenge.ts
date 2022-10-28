import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultBase } from './search.result.dto.entry.base.interface';
import { ISearchResult } from './search.result.entry.interface';

@ObjectType('SearchResultChallenge', {
  implements: () => [ISearchResult],
})
export abstract class ISearchResultChallenge
  extends ISearchResultBase
  implements ISearchResult
{
  @Field(() => IChallenge, {
    nullable: false,
    description: 'The Challenge that was found.',
  })
  challenge!: IChallenge;
}
