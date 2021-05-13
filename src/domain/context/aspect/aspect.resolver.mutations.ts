import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Aspect } from './aspect.entity';
import { IAspect } from './aspect.interface';
import { AspectService } from './aspect.service';
import { DeleteAspectInput, UpdateAspectInput } from '@domain/context/aspect';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { AuthorizationRolesGlobal, GraphqlGuard } from '@core/authorization';
@Resolver()
export class AspectResolverMutations {
  constructor(private aspectService: AspectService) {}

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => Aspect, {
    description: 'Deletes the specified Aspect.',
  })
  async deleteAspect(
    @Args('deleteData') deleteData: DeleteAspectInput
  ): Promise<IAspect> {
    return await this.aspectService.removeAspect(deleteData);
  }

  @AuthorizationGlobalRoles(AuthorizationRolesGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => Aspect, {
    description: 'Updates the specified Aspect.',
  })
  async updateAspect(
    @Args('aspectData') aspectData: UpdateAspectInput
  ): Promise<IAspect> {
    return await this.aspectService.updateAspect(aspectData);
  }
}
