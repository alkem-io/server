import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { invitationLifecycleConfig } from './invitation.lifecycle.config';
import { IInvitation } from './invitation.interface';
import { createMachine } from 'xstate';
import { ILifecycleFields } from '@domain/common/lifecycle/lifecycle.fields.interface';

@Resolver(() => IInvitation)
export class InvitationLifecycleResolverFields
  implements ILifecycleFields<IInvitation>
{
  private machine = createMachine(invitationLifecycleConfig);
  constructor(private lifecycleService: LifecycleService) {}

  @ResolveField('state', () => String, {
    nullable: false,
    description: 'The current state of this Lifecycle.',
  })
  state(@Parent() invitation: IInvitation): string {
    return this.lifecycleService.getState(invitation.lifecycle, this.machine);
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: false,
    description: 'The next events of this Lifecycle.',
  })
  nextEvents(@Parent() invitation: IInvitation): string[] {
    return this.lifecycleService.getNextEvents(
      invitation.lifecycle,
      this.machine
    );
  }

  @ResolveField('isFinalized', () => Boolean, {
    nullable: false,
    description: 'Is this lifecycle in a final state (done).',
  })
  isFinalized(@Parent() invitation: IInvitation): boolean {
    return this.lifecycleService.isFinalState(
      invitation.lifecycle,
      this.machine
    );
  }
}
