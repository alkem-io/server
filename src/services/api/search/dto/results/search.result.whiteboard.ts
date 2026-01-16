import { ISpace } from '@domain/space/space/space.interface';
import { IWhiteboard } from '@domain/common/whiteboard/whiteboard.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResult } from './search.result.interface';
import { SearchResultBase } from './search.result.base';

@ObjectType('SearchResultWhiteboard', {
  implements: () => ISearchResult,
})
export abstract class ISearchResultWhiteboard extends SearchResultBase() {
  @Field(() => IWhiteboard, {
    nullable: false,
    description: 'The Whiteboard that was found.',
  })
  whiteboard!: IWhiteboard;

  @Field(() => ISpace, {
    nullable: false,
    description: 'The Space of the Whiteboard.',
  })
  space!: ISpace;

  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout of the Whiteboard.',
  })
  callout!: ICallout;

  @Field(() => Boolean, {
    nullable: false,
    description:
      'Whether the Whiteboard is a contribution (response) or part of the framing.',
  })
  isContribution!: boolean;
}
