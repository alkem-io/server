import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AspectService } from './aspect.service';
import {
  DeleteAspectInput,
  UpdateAspectInput,
  IAspect,
} from '@domain/context/aspect';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationEngineService } from '@src/services/authorization-engine/authorization-engine.service';
import { AgentInfo } from '@core/authentication';

@Resolver()
export class AspectResolverMutations {
  constructor(
    private authorizationEngine: AuthorizationEngineService,
    private aspectService: AspectService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Deletes the specified Aspect.',
  })
  async deleteAspect(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteAspectInput
  ): Promise<IAspect> {
    const aspect = await this.aspectService.getAspectOrFail(deleteData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      aspect.authorization,
      AuthorizationPrivilege.DELETE,
      `delete aspect: ${aspect.title}`
    );
    return await this.aspectService.removeAspect(deleteData);
  }

  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Updates the specified Aspect.',
  })
  async updateAspect(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('aspectData') aspectData: UpdateAspectInput
  ): Promise<IAspect> {
    const aspect = await this.aspectService.getAspectOrFail(aspectData.ID);
    await this.authorizationEngine.grantAccessOrFail(
      agentInfo,
      aspect.authorization,
      AuthorizationPrivilege.UPDATE,
      `update aspect: ${aspect.title}`
    );
    return await this.aspectService.updateAspect(aspectData);
  }
}
