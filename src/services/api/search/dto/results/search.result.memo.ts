import { ISpace } from '@domain/space/space/space.interface';
import { IMemo } from '@domain/common/memo/memo.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResult } from './search.result.interface';
import { SearchResultBase } from './search.result.base';

@ObjectType('SearchResultMemo', {
  implements: () => ISearchResult,
})
export abstract class ISearchResultMemo extends SearchResultBase() {
  @Field(() => IMemo, {
    nullable: false,
    description: 'The Memo that was found.',
  })
  memo!: IMemo;

  @Field(() => ISpace, {
    nullable: false,
    description: 'The Space of the Memo.',
  })
  space!: ISpace;

  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout of the Memo.',
  })
  callout!: ICallout;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether the Memo is a contribution (response) or part of the framing.',
  })
  isContribution!: boolean;
}
