import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { invitationLifecycleConfig } from './invitation.lifecycle.config';
import { IInvitation } from './invitation.interface';
import { createMachine } from 'xstate';

@Resolver(() => IInvitation)
export class InvitationLifecycleResolverFields {
  private machine = createMachine(invitationLifecycleConfig);
  constructor(private lifecycleService: LifecycleService) {}

  @ResolveField('state', () => String, {
    nullable: true,
    description: 'The current state of this Lifecycle.',
  })
  async state(@Parent() invitation: IInvitation) {
    return await this.lifecycleService.getState(
      invitation.lifecycle,
      this.machine
    );
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: true,
    description: 'The next events of this Lifecycle.',
  })
  nextEvents(@Parent() invitation: IInvitation) {
    return this.lifecycleService.getNextEvents(
      invitation.lifecycle,
      this.machine
    );
  }

  @ResolveField('stateIsFinal', () => Boolean, {
    nullable: false,
    description: 'Is this lifecycle in a final state (done).',
  })
  async isFinalized(@Parent() invitation: IInvitation) {
    return await this.lifecycleService.isFinalState(
      invitation.lifecycle,
      this.machine
    );
  }
}
