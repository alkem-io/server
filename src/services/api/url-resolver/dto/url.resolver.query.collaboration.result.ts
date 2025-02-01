import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UrlResolverQueryResultCollaboration {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => UUID, {
    nullable: true,
  })
  calloutsSetId?: string;

  @Field(() => UUID, {
    nullable: true,
  })
  calloutId?: string;

  @Field(() => UUID, {
    nullable: true,
  })
  contributionId?: string;

  @Field(() => UUID, {
    nullable: true,
  })
  postId?: string;

  @Field(() => UUID, {
    nullable: true,
  })
  whiteboardId?: string;

  internalPath?: string;
}
