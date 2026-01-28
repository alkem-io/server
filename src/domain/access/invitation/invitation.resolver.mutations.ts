import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { DeleteInvitationInput } from './dto/invitation.dto.delete';
import { IInvitation } from './invitation.interface';
import { InvitationService } from './invitation.service';

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
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteInvitationInput
  ): Promise<IInvitation> {
    const invitation = await this.invitationService.getInvitationOrFail(
      deleteData.ID
    );
    this.authorizationService.grantAccessOrFail(
      agentInfo,
      invitation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete invitation to community: ${invitation.id}`
    );
    return this.invitationService.deleteInvitation(deleteData);
  }
}
