import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AspectService } from './aspect.service';
import {
  DeleteAspectInput,
  UpdateAspectInput,
  IAspect,
} from '@domain/context/aspect';
import { AuthorizationGlobalRoles } from '@common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AuthorizationRoleGlobal } from '@common/enums';
@Resolver()
export class AspectResolverMutations {
  constructor(private aspectService: AspectService) {}

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Deletes the specified Aspect.',
  })
  async deleteAspect(
    @Args('deleteData') deleteData: DeleteAspectInput
  ): Promise<IAspect> {
    return await this.aspectService.removeAspect(deleteData);
  }

  @AuthorizationGlobalRoles(AuthorizationRoleGlobal.Admin)
  @UseGuards(GraphqlGuard)
  @Mutation(() => IAspect, {
    description: 'Updates the specified Aspect.',
  })
  async updateAspect(
    @Args('aspectData') aspectData: UpdateAspectInput
  ): Promise<IAspect> {
    return await this.aspectService.updateAspect(aspectData);
  }
}
