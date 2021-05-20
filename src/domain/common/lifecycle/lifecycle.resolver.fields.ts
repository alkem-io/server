import { ILifecycle } from '@domain/common/lifecycle';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Profiling } from '@src/common/decorators';
import { LifecycleService } from './lifecycle.service';
@Resolver(() => ILifecycle)
export class LifecycleResolverFields {
  constructor(private lifecycleService: LifecycleService) {}

  @ResolveField('state', () => String, {
    nullable: true,
    description: 'The current state of this Lifecycle.',
  })
  @Profiling.api
  async state(@Parent() lifecycle: ILifecycle) {
    return await this.lifecycleService.getState(lifecycle);
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: true,
    description: 'The next events of this Lifecycle.',
  })
  @Profiling.api
  async nextEvents(@Parent() lifecycle: ILifecycle) {
    return await this.lifecycleService.getNextEvents(lifecycle);
  }

  @ResolveField('templateId', () => String, {
    nullable: true,
    description: 'The Lifecycle template identifier.',
  })
  @Profiling.api
  async templateId(@Parent() lifecycle: ILifecycle) {
    return await this.lifecycleService.getTemplateIdentifier(lifecycle);
  }
}
