import { Args, Query, Resolver } from '@nestjs/graphql';
import { UrlResolverQueryResults } from './dto/url.resolver.query.results';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { UrlResolverService } from './url.resolver.service';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class UrlResolverResolverQueries {
  constructor(private urlResolverService: UrlResolverService) {}

  @Query(() => UrlResolverQueryResults, {
    nullable: false,
    description: 'Allow resolving of a URL into a set of IDs.',
  })
  async urlResolver(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('url', { type: () => String }) url: string
  ): Promise<UrlResolverQueryResults> {
    return await this.urlResolverService.resolveUrl(url, agentInfo);
  }
}
