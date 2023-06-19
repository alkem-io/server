import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { IInnovationHxb } from './innovation.hub.interface';
import { AgentInfo } from '@core/authentication/agent-info';
import { AuthorizationPrivilege } from '@common/enums/authorization.privilege';
import { DeleteInnovationHxbInput } from './dto/innovation.hub.dto.delete';
import { InnovationHxbService } from './innovation.hub.service';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { CreateInnovationHxbInput } from './dto/innovation.hub.dto.create';
import { PlatformAuthorizationPolicyService } from '@platform/authorization/platform.authorization.policy.service';
import { UpdateInnovationHxbInput } from './dto/innovation.hub.dto.update';

@Resolver()
export class InnovationHxbResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private innovationHxbService: InnovationHxbService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationHxb, {
    description: 'Create Innovation Hxb.',
  })
  @Profiling.api
  async createInnovationHxb(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('createData') createData: CreateInnovationHxbInput
  ): Promise<IInnovationHxb> {
    const authorizationPolicy =
      this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'create innovation hub'
    );

    return await this.innovationHxbService.createOrFail(createData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationHxb, {
    description: 'Update Innovation Hxb.',
  })
  @Profiling.api
  async updateInnovationHxb(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('updateData') updateData: UpdateInnovationHxbInput
  ): Promise<IInnovationHxb> {
    const authorizationPolicy =
      this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'update innovation hub'
    );

    return await this.innovationHxbService.updateOrFail(updateData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInnovationHxb, {
    description: 'Delete Innovation Hxb.',
  })
  @Profiling.api
  async deleteInnovationHxb(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteInnovationHxbInput
  ): Promise<IInnovationHxb> {
    const authorizationPolicy =
      this.platformAuthorizationService.getPlatformAuthorizationPolicy();
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.PLATFORM_ADMIN,
      'delete innovation hub'
    );
    return await this.innovationHxbService.deleteOrFail(deleteData.ID);
  }
}
