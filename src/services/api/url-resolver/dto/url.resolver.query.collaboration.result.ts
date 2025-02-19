import { UUID } from '@domain/common/scalars';
import { Field, ObjectType } from '@nestjs/graphql';
import { UrlResolverQueryResultCalloutsSet } from './url.resolver.query.callouts.set.result';

@ObjectType()
export class UrlResolverQueryResultCollaboration {
  @Field(() => UUID, {
    nullable: false,
  })
  id!: string;

  @Field(() => UrlResolverQueryResultCalloutsSet, {
    nullable: false,
  })
  calloutsSet!: UrlResolverQueryResultCalloutsSet;

  internalPath?: string;
}
