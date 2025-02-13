import { Args, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GraphqlGuard } from '@core/authorization';
import { UrlResolverQueryResults } from './dto/url.resolver.query.results';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UrlResolverService } from './url.resolver.service';

@Resolver()
export class UrlResolverResolverQueries {
  constructor(
    private authorizationService: AuthorizationService,
    private urlResolverService: UrlResolverService
  ) {}

  @UseGuards(GraphqlGuard)
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
