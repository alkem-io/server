import { UrlType } from '@common/enums/url.type';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { UrlResolverQueryResultInnovationPack } from './url.resolver.query.innovation.pack.result';
import { UrlResolverQueryResultSpace } from './url.resolver.query.space.result';
import { UrlResolverQueryResultVirtualContributor } from './url.resolver.query.virtual.contributor.result';

@ObjectType({ isAbstract: true })
export abstract class UrlResolverResult {
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

  @Field(() => UrlResolverQueryResultVirtualContributor, {
    nullable: true,
  })
  virtualContributor?: UrlResolverQueryResultVirtualContributor;

  @Field(() => UUID, {
    nullable: true,
  })
  discussionId?: string;

  @Field(() => UUID, {
    nullable: true,
  })
  innovationHubId?: string;

  @Field(() => UrlResolverQueryResultInnovationPack, {
    nullable: true,
  })
  innovationPack?: UrlResolverQueryResultInnovationPack;
}
