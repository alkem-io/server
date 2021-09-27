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

  @ResolveField('stateIsFinal', () => Boolean, {
    nullable: false,
    description: 'Is this lifecycle in a final state (done).',
  })
  @Profiling.api
  async isFinalized(@Parent() lifecycle: ILifecycle) {
    return await this.lifecycleService.isFinalState(lifecycle);
  }

  @ResolveField('templateName', () => String, {
    nullable: true,
    description: 'The Lifecycle template name.',
  })
  @Profiling.api
  async templateName(@Parent() lifecycle: ILifecycle) {
    return await this.lifecycleService.getTemplateIdentifier(lifecycle);
  }
}
