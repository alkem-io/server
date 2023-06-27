import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DeleteInvitationExternalInput } from './dto/invitation.external..dto.delete';
import { InvitationExternalService } from './invitation.external.service';
import { IInvitationExternal } from './invitation.external.interface';

@Resolver()
export class InvitationExternalResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private invitationExternalService: InvitationExternalService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IInvitationExternal, {
    description: 'Removes the specified User invitationExternal.',
  })
  async deleteInvitationExternal(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeleteInvitationExternalInput
  ): Promise<IInvitationExternal> {
    const externalInvitation =
      await this.invitationExternalService.getInvitationExternalOrFail(
        deleteData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      externalInvitation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete invitationExternal to community: ${externalInvitation.id}`
    );
    return await this.invitationExternalService.deleteInvitationExternal(
      deleteData
    );
  }
}
