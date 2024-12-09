import { Inject, LoggerService, UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation, ObjectType } from '@nestjs/graphql';
import { VirtualContributorService } from './virtual.contributor.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege, LogContext } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { IVirtualContributor } from './virtual.contributor.interface';
import {
  DeleteVirtualContributorInput,
  UpdateVirtualContributorInput,
} from './dto';
import { RefreshVirtualContributorBodyOfKnowledgeInput } from './dto/virtual.contributor.dto.refresh.body.of.knowledge';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

@ObjectType('MigrateEmbeddings')
@Resolver(() => IVirtualContributor)
export class VirtualContributorResolverMutations {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private authorizationService: AuthorizationService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
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
      `virtual contribtor Update: ${virtual.id}`
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
      `delete virtual contributor: ${virtual.id}`
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
    @Args('refreshData')
    refreshData: RefreshVirtualContributorBodyOfKnowledgeInput
  ): Promise<boolean> {
    this.logger.verbose?.(
      `Refresh body of knowledge mutation invoked for VC ${refreshData.virtualContributorID}`,
      LogContext.VIRTUAL_CONTRIBUTOR
    );

    const virtual =
      await this.virtualContributorService.getVirtualContributorOrFail(
        refreshData.virtualContributorID,
        {
          relations: {
            aiPersona: true,
          },
        }
      );
    this.logger.verbose?.(
      `VC ${refreshData.virtualContributorID} found`,
      LogContext.VIRTUAL_CONTRIBUTOR
    );

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.UPDATE,
      `refresh body of knowledge: ${virtual.id}`
    );
    return await this.virtualContributorService.refreshBodyOfKnowledge(
      virtual,
      agentInfo
    );
  }
}
