import { ILifecycleFields } from '@domain/common/lifecycle/lifecycle.fields.interface';
import { Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { IInvitation } from './invitation.interface';
import { InvitationLifecycleService } from './invitation.service.lifecycle';

@InstrumentResolver()
@Resolver(() => IInvitation)
export class InvitationLifecycleResolverFields
  implements ILifecycleFields<IInvitation>
{
  constructor(private invitationLifecycleService: InvitationLifecycleService) {}

  @ResolveField('state', () => String, {
    nullable: false,
    description: 'The current state of this Lifecycle.',
  })
  state(@Parent() invitation: IInvitation): string {
    return this.invitationLifecycleService.getState(invitation.lifecycle);
  }

  @ResolveField('nextEvents', () => [String], {
    nullable: false,
    description: 'The next events of this Lifecycle.',
  })
  nextEvents(@Parent() invitation: IInvitation): string[] {
    return this.invitationLifecycleService.getNextEvents(invitation.lifecycle);
  }

  @ResolveField('isFinalized', () => Boolean, {
    nullable: false,
    description: 'Is this lifecycle in a final state (done).',
  })
  isFinalized(@Parent() invitation: IInvitation): boolean {
    return this.invitationLifecycleService.isFinalState(invitation.lifecycle);
  }
}
