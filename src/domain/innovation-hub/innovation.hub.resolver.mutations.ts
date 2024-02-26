import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IInnovationHub } from './innovation.hub.interface';
import { AgentInfo } from '@core/authentication.agent.info/agent-info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DeleteInnovationHubInput } from './dto/innovation.hub.dto.delete';
import { InnovationHubService } from './innovation.hub.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CreateInnovationHubInput } from './dto/innovation.hub.dto.create';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { UpdateInnovationHubInput } from './dto/innovation.hub.dto.update';

@Resolver()
export class InnovationHubResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationHubService: InnovationHubService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationHub, {
    description: 'Create Innovation Hub.',
  })
  @Profiling.api
  async createInnovationHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('createData') createData: CreateInnovationHubInput
  ): Promise<IInnovationHub> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'create innovation space'
    );

    return await this.innovationHubService.createOrFail(createData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationHub, {
    description: 'Update Innovation Hub.',
  })
  @Profiling.api
  async updateInnovationHub(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateInnovationHubInput
  ): Promise<IInnovationHub> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'update innovation space'
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
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'delete innovation space'
    );
    return await this.innovationHubService.deleteOrFail(deleteData.ID);
  }
}
