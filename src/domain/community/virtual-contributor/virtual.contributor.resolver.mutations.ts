import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation, ObjectType } from '@nestjs/graphql';
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
import { RefreshVirtualContributorBodyOfKnowledgeInput } from './dto/virtual.contributor.dto.refresh.body.of.knowlege';

@ObjectType('MigrateEmbeddings')
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
    this.authorizationService.grantAccessOrFail(
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
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${virtual.nameID}`
    );
    return await this.virtualContributorService.deleteVirtualContributor(
      deleteData.ID
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => Boolean, {
    description:
      'Triggers a request to the backing AI Service to refresh the knowledge that is available to it.',
  })
  async refreshVirtualContributorBodyOfKnowledge(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData')
    refreshData: RefreshVirtualContributorBodyOfKnowledgeInput
  ): Promise<boolean> {
    const virtual =
      await this.virtualContributorService.getVirtualContributorOrFail(
        refreshData.virtualContributorID,
        {
          relations: {
            aiPersona: true,
          },
        }
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.UPDATE,
      `deleteOrg: ${virtual.nameID}`
    );
    return await this.virtualContributorService.refershBodyOfKnowledge(
      virtual,
      agentInfo
    );
  }
}
