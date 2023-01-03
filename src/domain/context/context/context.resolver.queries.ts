import { Args, Query, Resolver } from '@nestjs/graphql';
import { ContextService } from './context.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { IContext } from './context.interface';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver()
export class ContextResolverQueries {
  constructor(
    private contextService: ContextService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => IContext, {
    nullable: false,
    description: 'A specific Context entity.',
  })
  async context(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) ID: string
  ): Promise<IContext> {
    const context = await this.contextService.getContextOrFail(ID);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      context.authorization,
      AuthorizationPrivilege.READ,
      `querying Context entity directly: ${context.id}`
    );
    return context;
  }
}
