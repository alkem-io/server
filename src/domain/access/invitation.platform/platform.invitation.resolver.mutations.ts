import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@src/common/decorators';
import { GraphqlGuard } from '@core/authorization';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationPrivilege } from '@common/enums';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { DeletePlatformInvitationInput } from './dto/platform.invitation.dto.delete';
import { PlatformInvitationService } from './platform.invitation.service';
import { IPlatformInvitation } from './platform.invitation.interface';

@Resolver()
export class PlatformInvitationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformInvitationService: PlatformInvitationService
  ) {}

  @UseGuards(GraphqlGuard)
  @Mutation(() => IPlatformInvitation, {
    description: 'Removes the specified User platformInvitation.',
  })
  async deletePlatformInvitation(
    @CurrentUser() agentInfo: AgentInfo,
    @Args('deleteData') deleteData: DeletePlatformInvitationInput
  ): Promise<IPlatformInvitation> {
    const platformInvitation =
      await this.platformInvitationService.getPlatformInvitationOrFail(
        deleteData.ID
      );
    await this.authorizationService.grantAccessOrFail(
      agentInfo,
      platformInvitation.authorization,
      AuthorizationPrivilege.DELETE,
      `delete platformInvitation: ${platformInvitation.id}`
    );
    return await this.platformInvitationService.deletePlatformInvitation(
      deleteData
    );
  }
}
