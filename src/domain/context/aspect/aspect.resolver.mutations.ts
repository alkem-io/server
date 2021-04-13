import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Aspect } from './aspect.entity';
import { IAspect } from './aspect.interface';
import { AspectService } from './aspect.service';
import { DeleteAspectInput, UpdateAspectInput } from '@domain/context/aspect';

@Resolver()
export class AspectResolverMutations {
  constructor(private aspectService: AspectService) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Aspect, {
    description: 'Deletes the specified Aspect.',
  })
  async deleteAspect(
    @Args('deleteData') deleteData: DeleteAspectInput
  ): Promise<IAspect> {
    return await this.aspectService.removeAspect(deleteData);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Aspect, {
    description: 'Updates the specified Aspect.',
  })
  async updateAspect(
    @Args('aspectData') aspectData: UpdateAspectInput
  ): Promise<IAspect> {
    return await this.aspectService.updateAspect(aspectData);
  }
}
