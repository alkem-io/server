import { UrlType } from '@common/enums/url.type';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { UrlResolverQueryResultSpace } from './url.resolver.query.space.result';
import { UrlResolverQueryResultInnovationPack } from './url.resolver.query.innovation.pack.result';

@ObjectType()
export class UrlResolverQueryResults {
  @Field(() => UrlType, {
    nullable: false,
  })
  type!: UrlType;

  @Field(() => UrlResolverQueryResultSpace, {
    nullable: true,
  })
  space?: UrlResolverQueryResultSpace;

  @Field(() => UUID, {
    nullable: true,
  })
  organizationId?: string;

  @Field(() => UUID, {
    nullable: true,
  })
  userId?: string;

  @Field(() => UUID, {
    nullable: true,
  })
  vcId?: string;

  @Field(() => UUID, {
    nullable: true,
  })
  discussionId?: string;

  @Field(() => UrlResolverQueryResultInnovationPack, {
    nullable: true,
  })
  innovationPack?: UrlResolverQueryResultInnovationPack;
}
