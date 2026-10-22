import { AuthorizationPrivilege } from '@common/enums';
import { RoleSetType } from '@common/enums/role.set.type';
import { ActorContext } from '@core/actor-context/actor.context';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { ActorLookupService } from '@domain/actor/actor-lookup/actor.lookup.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentActor } from '@src/common/decorators';
import { DeleteInvitationInput } from './dto/invitation.dto.delete';
import { IInvitation } from './invitation.interface';
import { InvitationService } from './invitation.service';
import {
  emitSpaceInvitationAcceptorsChanged,
  isAcceptedByAccountAdmins,
} from './invitation.space.acceptors.event';

@InstrumentResolver()
@Resolver()
export class InvitationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private invitationService: InvitationService,
    private actorLookupService: ActorLookupService,
    private eventEmitter: EventEmitter2
  ) {}

  @Mutation(() => IInvitation, {
    description: 'Removes the specified User invitation.',
  })
  async deleteInvitation(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteInvitationInput
  ): Promise<IInvitation> {
    const invitation = await this.invitationService.getInvitationOrFail(
      deleteData.ID,
      { relations: { roleSet: true } }
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      invitation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete invitation to community: ${invitation.id}`
    );
    const deleted = await this.invitationService.deleteInvitation(deleteData);

    const invitedActorType = await this.actorLookupService.getActorTypeById(
      invitation.invitedActorID
    );
    if (
      invitation.roleSet?.type === RoleSetType.SPACE &&
      isAcceptedByAccountAdmins(invitedActorType)
    ) {
      await emitSpaceInvitationAcceptorsChanged(this.eventEmitter, [
        invitation.roleSet.id,
      ]);
    }
    return deleted;
  }
}
