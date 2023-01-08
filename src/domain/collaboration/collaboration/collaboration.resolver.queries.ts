import { Args, Query, Resolver } from '@nestjs/graphql';
import { CollaborationService } from './collaboration.service';
import { UUID } from '@domain/common/scalars/scalar.uuid';
import { ICollaboration } from './collaboration.interface';
import { UseGuards } from '@nestjs/common/decorators/core/use-guards.decorator';
import { GraphqlGuard } from '@core/authorization/graphql.guard';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';

@Resolver()
export class CollaborationResolverQueries {
  constructor(
    private collaborationService: CollaborationService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Query(() => ICollaboration, {
    nullable: false,
    description: 'A specific Collaboration entity.',
  })
  async collaboration(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('ID', { type: () => UUID }) ID: string
  ): Promise<ICollaboration> {
    const collaboration =
      await this.collaborationService.getCollaborationOrFail(ID);
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      collaboration.authorization,
      AuthorizationPrivilege.READ,
      `querying Collaboration entity directly: ${collaboration.id}`
    );
    return collaboration;
  }
}
