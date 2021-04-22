import { Parent, ResolveField, Resolver } from '@nestjs/graphql';

import { Profiling } from '@src/common/decorators';
import { Lifecycle } from './lifecycle.entity';
import { LifecycleService } from './lifecycle.service';

@Resolver(() => Lifecycle)
export class LifecycleResolverFields {
  constructor(private lifecycleService: LifecycleService) {}

  @ResolveField('state', () => String, {
    nullable: true,
    description: 'The current state of this Lifecycle.',
  })
  @Profiling.api
  async state(@Parent() lifecycle: Lifecycle) {
    return await this.lifecycleService.getState(lifecycle);
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: true,
    description: 'The next events of this Lifecycle.',
  })
  @Profiling.api
  async nextEvents(@Parent() lifecycle: Lifecycle) {
    return await this.lifecycleService.getNextEvents(lifecycle);
  }

  @ResolveField('templateId', () => String, {
    nullable: true,
    description: 'The Lifecycle template identifier.',
  })
  @Profiling.api
  async templateId(@Parent() lifecycle: Lifecycle) {
    return await this.lifecycleService.getTemplateIdentifier(lifecycle);
  }
}
