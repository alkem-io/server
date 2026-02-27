import { CurrentActor } from '@common/decorators/current-actor.decorator';
import { ActorContext } from '@core/actor-context/actor.context';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { UrlResolverQueryResults } from './dto/url.resolver.query.results';
import { UrlResolverService } from './url.resolver.service';

@InstrumentResolver()
@Resolver()
export class UrlResolverResolverQueries {
  constructor(private urlResolverService: UrlResolverService) {}

  @Query(() => UrlResolverQueryResults, {
    nullable: false,
    description: 'Allow resolving of a URL into a set of IDs.',
  })
  async urlResolver(
    @CurrentActor() actorContext: ActorContext,
    @Args('url', { type: () => String }) url: string
  ): Promise<UrlResolverQueryResults> {
    return await this.urlResolverService.resolveUrl(url, actorContext);
  }
}
