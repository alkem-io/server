import { ISpace } from '@domain/space/space/space.interface';
import { IPost } from '@domain/collaboration/post/post.interface';
import { ICallout } from '@domain/collaboration/callout/callout.interface';
import { Field, ObjectType } from '@nestjs/graphql';
import { ISearchResult } from './search.result.interface';
import { SearchResultBase } from './search.result.base';

@ObjectType('SearchResultPost', {
  implements: () => ISearchResult,
})
export abstract class ISearchResultPost extends SearchResultBase() {
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
}
