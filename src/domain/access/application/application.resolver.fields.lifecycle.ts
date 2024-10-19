import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { applicationLifecycleConfig } from './application.lifecycle.config';
import { IApplication } from './application.interface';

@Resolver(() => IApplication)
export class ApplicationLifecycleResolverFields {
  constructor(private lifecycleService: LifecycleService) {}

  @ResolveField('state', () => String, {
    nullable: true,
    description: 'The current state of this Lifecycle.',
  })
  async state(@Parent() application: IApplication) {
    return await this.lifecycleService.getState(
      application.lifecycle,
      applicationLifecycleConfig
    );
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: true,
    description: 'The next events of this Lifecycle.',
  })
  nextEvents(@Parent() application: IApplication) {
    return this.lifecycleService.getNextEvents(
      application.lifecycle,
      applicationLifecycleConfig
    );
  }

  @ResolveField('stateIsFinal', () => Boolean, {
    nullable: false,
    description: 'Is this lifecycle in a final state (done).',
  })
  async isFinalized(@Parent() application: IApplication) {
    return await this.lifecycleService.isFinalState(
      application.lifecycle,
      applicationLifecycleConfig
    );
  }
}
