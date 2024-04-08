import { ISpace } from '@domain/challenge/space/space.interface';
import { IPost } from '@domain/collaboration/post/post.interface';
import { ICallout } from '@domain/collaboration/callout';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResultBase } from './search.result.dto.entry.base.interface';
import { ISearchResult } from './search.result.entry.interface';

@ObjectType('SearchResultPost', {
  implements: () => [ISearchResult],
})
export abstract class ISearchResultPost
  extends ISearchResultBase
  implements ISearchResult
{
  @Field(() => IPost, {
    nullable: false,
    description: 'The Post that was found.',
  })
  post!: IPost;

  @Field(() => ISpace, {
    nullable: false,
    description: 'The Space of the Post.',
  })
  space!: ISpace;

  @Field(() => ICallout, {
    nullable: false,
    description: 'The Callout of the Post.',
  })
  callout!: ICallout;

  @Field(() => ISpace, {
    nullable: true,
    description:
      'The Challenge of the Post. Applicable for Callouts on Opportunities and Challenges.',
  })
  subspace?: ISpace;

  @Field(() => ISpace, {
    nullable: true,
    description:
      'The Opportunity of the Post. Applicable only for Callouts on Opportunities.',
  })
  subsubspace?: ISpace;
}
