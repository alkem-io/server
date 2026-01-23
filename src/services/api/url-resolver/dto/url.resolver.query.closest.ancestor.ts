import { Field, ObjectType } from '@nestjs/graphql';
import { UrlResolverResult } from './url.resolver.result';

@ObjectType()
export class UrlResolverQueryClosestAncestor extends UrlResolverResult {
  @Field(() => String, {
    nullable: false,
  })
  url!: string;
}
