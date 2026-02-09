import { ILifecycleFields } from '@domain/common/lifecycle/lifecycle.fields.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { IApplication } from './application.interface';
import { ApplicationLifecycleService } from './application.service.lifecycle';

@InstrumentResolver()
@Resolver(() => IApplication)
export class ApplicationLifecycleResolverFields
  implements ILifecycleFields<IApplication>
{
  constructor(
    private applicationLifecycleService: ApplicationLifecycleService
  ) {}

  @ResolveField('state', () => String, {
    nullable: false,
    description: 'The current state of this Lifecycle.',
  })
  state(@Parent() application: IApplication): string {
    return this.applicationLifecycleService.getState(application.lifecycle);
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: false,
    description: 'The next events of this Lifecycle.',
  })
  nextEvents(@Parent() application: IApplication): string[] {
    return this.applicationLifecycleService.getNextEvents(
      application.lifecycle
    );
  }

  @ResolveField('isFinalized', () => Boolean, {
    nullable: false,
    description: 'Is this lifecycle in a final state (done).',
  })
  isFinalized(@Parent() application: IApplication): boolean {
    return this.applicationLifecycleService.isFinalState(application.lifecycle);
  }
}
