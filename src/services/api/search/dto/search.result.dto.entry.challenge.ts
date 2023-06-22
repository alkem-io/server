import { IChallenge } from '@domain/challenge/challenge/challenge.interface';
import { ISpace } from '@domain/challenge/space/space.interface';
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

  @Field(() => ISpace, {
    nullable: false,
    description: 'The Space that the Challenge is in.',
  })
  space!: ISpace;
}
