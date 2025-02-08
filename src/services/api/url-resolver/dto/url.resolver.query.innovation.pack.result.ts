import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { UrlResolverQueryResultTemplatesSet } from './url.resolver.query.templates.set.result';

@ObjectType()
export class UrlResolverQueryResultInnovationPack {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => UrlResolverQueryResultTemplatesSet, {
    nullable: false,
  })
  templatesSet!: UrlResolverQueryResultTemplatesSet;

  internalPath?: string;
}
