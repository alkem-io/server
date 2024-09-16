import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DeleteInvitationInput } from './dto/invitation.dto.delete';
import { InvitationService } from './invitation.service';
import { IInvitation } from './invitation.interface';

@Resolver()
export class InvitationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private invitationService: InvitationService
  ) {}

  @UseGuards(GraphqlGuard)
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
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      invitation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete invitation to community: ${invitation.id}`
    );
    return await this.invitationService.deleteInvitation(deleteData);
  }
}
