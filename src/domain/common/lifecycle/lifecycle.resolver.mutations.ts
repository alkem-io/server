import { Roles } from '@common/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthorizationRoles } from '@src/core/authorization/authorization.roles';
import { GqlAuthGuard } from '@src/core/authorization/graphql.guard';
import { LifecycleEventInput } from './lifecycle.dto.transition';
import { Lifecycle } from './lifecycle.entity';
import { ILifecycle } from './lifecycle.interface';
import { LifecycleService } from './lifecycle.service';

@Resolver()
export class LifecycleResolverMutations {
  constructor(private lifecycleService: LifecycleService) {}

  @Roles(AuthorizationRoles.CommunityAdmins, AuthorizationRoles.EcoverseAdmins)
  @UseGuards(GqlAuthGuard)
  @Mutation(() => Lifecycle, {
    description: 'Trigger an event on the lifecycle.',
  })
  async updateLifecycle(
    @Args('lifecycleEventData') lifecycleEventData: LifecycleEventInput
  ): Promise<ILifecycle> {
    return await this.lifecycleService.event(lifecycleEventData);
  }
}
