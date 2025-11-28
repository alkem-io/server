import { UrlType } from '@common/enums/url.type';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UrlResolverQueryResultCalloutsSet {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

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

  @Field(() => UUID, {
    nullable: true,
  })
  memoId?: string;

  @Field(() => UrlType, {
    nullable: false,
  })
  type!: UrlType;
}
