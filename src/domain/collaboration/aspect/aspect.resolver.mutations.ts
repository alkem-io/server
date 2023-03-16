import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AspectService } from './aspect.service';
import { DeleteAspectInput } from '@domain/collaboration/aspect/dto/aspect.dto.delete';
import { UpdateAspectInput } from '@domain/collaboration/aspect/dto/aspect.dto.update';
import { IAspect } from '@domain/collaboration/aspect/aspect.interface';
import { CurrentUser } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { AgentInfo } from '@core/authentication';

@Resolver()
export class AspectResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aspect.authorization,
      AuthorizationPrivilege.DELETE,
      `delete aspect: ${aspect.nameID}`
    );
    return await this.aspectService.deleteAspect(deleteData);
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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      aspect.authorization,
      AuthorizationPrivilege.UPDATE,
      `update aspect: ${aspect.nameID}`
    );
    return await this.aspectService.updateAspect(aspectData);
  }
}
