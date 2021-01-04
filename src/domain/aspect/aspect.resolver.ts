import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { GqlAuthGuard } from '@utils/authentication/graphql.guard';
import { Roles } from '@utils/decorators/roles.decorator';
import { RestrictedGroupNames } from '@domain/user-group/user-group.entity';
import { AspectInput } from './aspect.dto';
import { Aspect } from './aspect.entity';
import { IAspect } from './aspect.interface';
import { AspectService } from './aspect.service';

@Resolver()
export class AspectResolver {
  constructor(private aspectService: AspectService) {}

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Boolean, {
    description: 'Removes the aspect with the specified ID',
  })
  async removeAspect(@Args('ID') aspectID: number): Promise<boolean> {
    return await this.aspectService.removeAspect(aspectID);
  }

  @Roles(RestrictedGroupNames.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Aspect, {
    description: 'Updates the aspect with the specified ID',
  })
  async updateAspect(
    @Args('ID') aspectID: number,
    @Args('aspectData') aspectData: AspectInput
  ): Promise<IAspect> {
    return await this.aspectService.updateAspect(aspectID, aspectData);
  }
}
