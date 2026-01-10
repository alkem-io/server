import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentActor } from '@src/common/decorators';
import { ActorContext } from '@core/actor-context';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DeleteInvitationInput } from './dto/invitation.dto.delete';
import { InvitationService } from './invitation.service';
import { IInvitation } from './invitation.interface';
import { InstrumentResolver } from '@src/apm/decorators';

@InstrumentResolver()
@Resolver()
export class InvitationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private invitationService: InvitationService
  ) {}

  @Mutation(() => IInvitation, {
    description: 'Removes the specified User invitation.',
  })
  async deleteInvitation(
    @CurrentActor() actorContext: ActorContext,
    @Args('deleteData') deleteData: DeleteInvitationInput
  ): Promise<IInvitation> {
    const invitation = await this.invitationService.getInvitationOrFail(
      deleteData.ID
    );
    this.authorizationService.grantAccessOrFail(
      actorContext,
      invitation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete invitation to community: ${invitation.id}`
    );
    return this.invitationService.deleteInvitation(deleteData);
  }
}
