import { LifecycleService } from '@domain/common/lifecycle/lifecycle.service';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { invitationLifecycleConfig } from './invitation.lifecycle.config';
import { IInvitation } from './invitation.interface';

@Resolver(() => IInvitation)
export class InvitationLifecycleResolverFields {
  constructor(private lifecycleService: LifecycleService) {}

  @ResolveField('state', () => String, {
    nullable: true,
    description: 'The current state of this Lifecycle.',
  })
  async state(@Parent() invitation: IInvitation) {
    return await this.lifecycleService.getState(
      invitation.lifecycle,
      invitationLifecycleConfig
    );
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: true,
    description: 'The next events of this Lifecycle.',
  })
  nextEvents(@Parent() invitation: IInvitation) {
    return this.lifecycleService.getNextEvents(
      invitation.lifecycle,
      invitationLifecycleConfig
    );
  }

  @ResolveField('stateIsFinal', () => Boolean, {
    nullable: false,
    description: 'Is this lifecycle in a final state (done).',
  })
  async isFinalized(@Parent() invitation: IInvitation) {
    return await this.lifecycleService.isFinalState(
      invitation.lifecycle,
      invitationLifecycleConfig
    );
  }
}
