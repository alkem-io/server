import { UrlType } from '@common/enums/url.type';
import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { UrlResolverQueryResultSpace } from './url.resolver.query.space.result';

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
}
