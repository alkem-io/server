import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { VirtualContributorService } from './virtual.contributor.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IVirtualContributor } from './virtual.contributor.interface';
import {
  DeleteVirtualContributorInput,
  UpdateVirtualContributorInput,
} from './dto';

@Resolver(() => IVirtualContributor)
export class VirtualContributorResolverMutations {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private authorizationService: AuthorizationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Updates the specified VirtualContributor.',
  })
  @Profiling.api
  async updateVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualContributorData')
    virtualContributorData: UpdateVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const virtual =
      await this.virtualContributorService.getVirtualContributorOrFail(
        virtualContributorData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${virtual.nameID}`
    );

    return await this.virtualContributorService.updateVirtualContributor(
      virtualContributorData
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtualContributor, {
    description: 'Deletes the specified VirtualContributor.',
  })
  async deleteVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const virtual =
      await this.virtualContributorService.getVirtualContributorOrFail(
        deleteData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${virtual.nameID}`
    );
    return await this.virtualContributorService.deleteVirtualContributor(
      deleteData.ID
    );
  }
}
