import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Aspect } from './aspect.entity';
import { IAspect } from './aspect.interface';
import { AspectService } from './aspect.service';
import { UpdateAspectInput } from '@domain/context/aspect';

@Resolver()
export class AspectResolverMutations {
  constructor(private aspectService: AspectService) {}

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the aspect with the specified ID',
  })
  async removeAspect(@Args('ID') aspectID: number): Promise<boolean> {
    return await this.aspectService.removeAspect(aspectID);
  }

  @Roles(AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Aspect, {
    description: 'Updates the aspect with the specified ID',
  })
  async updateAspect(
    @Args('aspectData') aspectData: UpdateAspectInput
  ): Promise<IAspect> {
    return await this.aspectService.updateAspect(aspectData);
  }
}
