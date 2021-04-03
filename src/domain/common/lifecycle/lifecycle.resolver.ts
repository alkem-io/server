import { Inject } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { Lifecycle } from './lifecycle.entity';
import { ILifecycle } from './lifecycle.interface';
import { LifecycleService } from './lifecycle.service';

@Resolver()
export class LifecycleResolver {
  constructor(
    @Inject(LifecycleService) private lifecycleService: LifecycleService
  ) {}

  @Mutation(() => Lifecycle, {
    description: 'Update the state',
  })
  async testState(
    @Args('ID') ID: number,
    @Args('event') event: string
  ): Promise<ILifecycle> {
    return await this.lifecycleService.updateState(ID, event);
  }
}
