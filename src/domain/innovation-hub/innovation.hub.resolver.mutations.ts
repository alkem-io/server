import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IInnovationHub } from './innovation.hub.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DeleteInnovationHubInput } from './dto/innovation.hub.dto.delete';
import { InnovationHubService } from './innovation.hub.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { UpdateInnovationHubInput } from './dto/innovation.hub.dto.update';

@Resolver()
export class InnovationHubResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationHubService: InnovationHubService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationHub, {
    description: 'Update Innovation Hub.',
  })
  @Profiling.api
  async updateInnovationHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateInnovationHubInput
  ): Promise<IInnovationHub> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubOrFail(updateData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationHub.authorization,
      AuthorizationPrivilege.UPDATE,
      'update innovation hub'
    );

    return await this.innovationHubService.updateOrFail(updateData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationHub, {
    description: 'Delete Innovation Hub.',
  })
  @Profiling.api
  async deleteInnovationHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteInnovationHubInput
  ): Promise<IInnovationHub> {
    const innovationHub =
      await this.innovationHubService.getInnovationHubOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      innovationHub.authorization,
      AuthorizationPrivilege.DELETE,
      'delete innovation hub'
    );
    return await this.innovationHubService.delete(deleteData.ID);
  }
}
