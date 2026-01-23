import { Field, ObjectType } from '@nestjs/graphql';
import { UrlResolverQueryClosestAncestor } from './url.resolver.query.closest.ancestor';
import { UrlResolverResult } from './url.resolver.result';
import { UrlResolverResultState } from './url.resolver.result.state';

@ObjectType()
export class UrlResolverQueryResults extends UrlResolverResult {
  @Field(() => UrlResolverResultState, {
    nullable: false,
  })
  state!: UrlResolverResultState;

  @Field(() => UrlResolverQueryClosestAncestor, {
    nullable: true,
  })
  closestAncestor?: UrlResolverQueryClosestAncestor;
}
