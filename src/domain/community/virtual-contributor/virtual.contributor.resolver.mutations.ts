import { Inject, LoggerService } from '@nestjs/common';
import { Args, Resolver, Mutation, ObjectType } from '@nestjs/graphql';
import { VirtualContributorService } from './virtual.contributor.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
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
import { UpdateVirtualContributorSettingsInput } from './dto/virtual.contributor.dto.update.settings';
import { VirtualContributorAuthorizationService } from './virtual.contributor.service.authorization';
import { RelationshipNotFoundException } from '@common/exceptions';
import { AuthorizationPolicyService } from '@domain/common/authorization-policy/authorization.policy.service';
import { InstrumentResolver } from '@src/apm/decorators';

@ObjectType('MigrateEmbeddings') // TODO: what is this about?
@InstrumentResolver()
@Resolver(() => IVirtualContributor)
export class VirtualContributorResolverMutations {
  constructor(
    private virtualContributorService: VirtualContributorService,
    private virtualContributorAuthorizationService: VirtualContributorAuthorizationService,
    private authorizationService: AuthorizationService,
    private authorizationPolicyService: AuthorizationPolicyService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService
  ) {}

  @Mutation(() => IVirtualContributor, {
    description: 'Updates the specified VirtualContributor.',
  })
  @Profiling.api
  async updateVirtualContributor(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualContributorData')
    virtualContributorData: UpdateVirtualContributorInput
  ): Promise<IVirtualContributor> {
    const virtualContributor =
      await this.virtualContributorService.getVirtualContributorOrFail(
        virtualContributorData.ID
      );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtualContributor.authorization,
      AuthorizationPrivilege.UPDATE,
      `virtual contributor Update: ${virtualContributor.id}`
    );

    const updatedVirtualContributor =
      await this.virtualContributorService.updateVirtualContributor(
        virtualContributorData
      );

    // Reset authorization policy as updates may affect authorization (e.g. searchVisibility changes)
    const updatedAuthorizations =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        updatedVirtualContributor
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return this.virtualContributorService.getVirtualContributorOrFail(
      updatedVirtualContributor.id
    );
  }

  @Mutation(() => IVirtualContributor, {
    description: 'Updates one of the Setting on an Organization',
  })
  async updateVirtualContributorSettings(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('settingsData')
    settingsData: UpdateVirtualContributorSettingsInput
  ): Promise<IVirtualContributor> {
    let virtualContributor =
      await this.virtualContributorService.getVirtualContributorOrFail(
        settingsData.virtualContributorID,
        {
          relations: {
            account: {
              authorization: true,
            },
          },
        }
      );

    const accountAuthorization = virtualContributor.account?.authorization;
    if (!accountAuthorization) {
      throw new RelationshipNotFoundException(
        `Unable to load authorizing account for VC ${virtualContributor.id}`,
        LogContext.VIRTUAL_CONTRIBUTOR
      );
    }

    this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtualContributor.authorization,
      AuthorizationPrivilege.UPDATE,
      `virtualContributor settings update: ${virtualContributor.id}`
    );

    virtualContributor =
      await this.virtualContributorService.updateVirtualContributorSettings(
        virtualContributor,
        settingsData.settings
      );
    virtualContributor =
      await this.virtualContributorService.save(virtualContributor);
    // As the settings may update the authorization for the Space, the authorization policy will need to be reset

    const updatedAuthorizations =
      await this.virtualContributorAuthorizationService.applyAuthorizationPolicy(
        virtualContributor
      );
    await this.authorizationPolicyService.saveAll(updatedAuthorizations);

    return this.virtualContributorService.getVirtualContributorOrFail(
      virtualContributor.id
    );
  }

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
        refreshData.virtualContributorID
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
