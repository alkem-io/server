import { UrlType } from '@common/enums/url.type';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UrlResolverQueryResults {
  @Field(() => UrlType, {
    nullable: true,
  })
  type?: UrlType;

  @Field(() => String, {
    nullable: true,
  })
  spaceId?: string;

  @Field(() => String, {
    nullable: true,
  })
  subspaceId?: string;

  @Field(() => String, {
    nullable: true,
  })
  subsubspaceId?: string;

  @Field(() => String, {
    nullable: true,
  })
  organizationId?: string;

  @Field(() => String, {
    nullable: true,
  })
  innovationPackId?: string;

  @Field(() => String, {
    nullable: true,
  })
  innovationHubId?: string;

  @Field(() => String, {
    nullable: true,
  })
  templateId?: string;

  @Field(() => String, {
    nullable: true,
  })
  collaborationId?: string;

  @Field(() => String, {
    nullable: true,
  })
  calloutsSetId?: string;

  @Field(() => String, {
    nullable: true,
  })
  calloutId?: string;

  @Field(() => String, {
    nullable: true,
  })
  contributionId?: string;

  @Field(() => String, {
    nullable: true,
  })
  postId?: string;

  @Field(() => String, {
    nullable: true,
  })
  whiteboardId?: string;

  @Field(() => String, {
    nullable: true,
  })
  userId?: string;

  @Field(() => String, {
    nullable: true,
  })
  vcId?: string;
}
