import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { applicationLifecycleConfig } from './application.lifecycle.config';
import { IApplication } from './application.interface';
import { createMachine } from 'xstate';
import { ILifecycleFields } from '@domain/common/lifecycle/lifecycle.fields.interface';

@Resolver(() => IApplication)
export class ApplicationLifecycleResolverFields
  implements ILifecycleFields<IApplication>
{
  private machine = createMachine(applicationLifecycleConfig);

  constructor(private lifecycleService: LifecycleService) {}

  @ResolveField('state', () => String, {
    nullable: true,
    description: 'The current state of this Lifecycle.',
  })
  state(@Parent() application: IApplication): string {
    return this.lifecycleService.getState(application.lifecycle, this.machine);
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: true,
    description: 'The next events of this Lifecycle.',
  })
  nextEvents(@Parent() application: IApplication): string[] {
    return this.lifecycleService.getNextEvents(
      application.lifecycle,
      this.machine
    );
  }

  @ResolveField('isFinalized', () => Boolean, {
    nullable: false,
    description: 'Is this lifecycle in a final state (done).',
  })
  isFinalized(@Parent() application: IApplication): boolean {
    return this.lifecycleService.isFinalState(
      application.lifecycle,
      this.machine
    );
  }
}
