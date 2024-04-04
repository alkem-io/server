import { UseGuards } from '@nestjs/common';
import { Args, Resolver, Mutation } from '@nestjs/graphql';
import { VirtualService } from './virtual.service';
import { CurrentUser, Profiling } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { VirtualAuthorizationService } from './virtual.service.authorization';
import { AgentInfo } from '@core/authentication/agent-info';
import { VirtualAuthorizationResetInput } from './dto/virtual.contributor.dto.reset.authorization';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { PlatformAuthorizationPolicyService } from '@src/platform/authorization/platform.authorization.policy.service';
import { IVirtual } from './virtual.interface';
import {
  CreateVirtualInput,
  DeleteVirtualInput,
  UpdateVirtualInput,
} from './dto';

@Resolver(() => IVirtual)
export class VirtualResolverMutations {
  constructor(
    private virtualAuthorizationService: VirtualAuthorizationService,
    private virtualService: VirtualService,
    private authorizationService: AuthorizationService,
    private platformAuthorizationService: PlatformAuthorizationPolicyService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtual, {
    description: 'Creates a new Virtual on the platform.',
  })
  @Profiling.api
  async createVirtual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualData') virtualData: CreateVirtualInput
  ): Promise<IVirtual> {
    const authorizationPolicy =
      await this.platformAuthorizationService.getPlatformAuthorizationPolicy();

    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      authorizationPolicy,
      AuthorizationPrivilege.CREATE_ORGANIZATION,
      `create Virtual: ${virtualData.nameID}`
    );
    const virtual = await this.virtualService.createVirtual(virtualData);

    return await this.virtualAuthorizationService.applyAuthorizationPolicy(
      virtual
    );
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtual, {
    description: 'Updates the specified Virtual.',
  })
  @Profiling.api
  async updateVirtual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('virtualData') virtualData: UpdateVirtualInput
  ): Promise<IVirtual> {
    const virtual = await this.virtualService.getVirtualOrFail(virtualData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.UPDATE,
      `orgUpdate: ${virtual.nameID}`
    );

    return await this.virtualService.updateVirtual(virtualData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtual, {
    description: 'Deletes the specified Virtual.',
  })
  async deleteVirtual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteVirtualInput
  ): Promise<IVirtual> {
    const virtual = await this.virtualService.getVirtualOrFail(deleteData.ID);
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.DELETE,
      `deleteOrg: ${virtual.nameID}`
    );
    return await this.virtualService.deleteVirtual(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IVirtual, {
    description: 'Reset the Authorization Policy on the specified Virtual.',
  })
  @Profiling.api
  async authorizationPolicyResetOnVirtual(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('authorizationResetData')
    authorizationResetData: VirtualAuthorizationResetInput
  ): Promise<IVirtual> {
    const virtual = await this.virtualService.getVirtualOrFail(
      authorizationResetData.virtualID,
      {
        relations: {
          profile: {
            storageBucket: true,
          },
        },
      }
    );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      virtual.authorization,
      AuthorizationPrivilege.AUTHORIZATION_RESET,
      `reset authorization definition on virtual: ${authorizationResetData.virtualID}`
    );
    return await this.virtualAuthorizationService.applyAuthorizationPolicy(
      virtual
    );
  }
}
