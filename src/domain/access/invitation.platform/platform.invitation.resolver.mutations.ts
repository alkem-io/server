import { AuthorizationPrivilege } from '@common/enums';
import { AgentInfo } from '@core/authentication.agent.info/agent.info';
import { AuthorizationService } from '@core/authorization/authorization.service';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { InstrumentResolver } from '@src/apm/decorators';
import { CurrentUser } from '@src/common/decorators';
import { DeletePlatformInvitationInput } from './dto/platform.invitation.dto.delete';
import { IPlatformInvitation } from './platform.invitation.interface';
import { PlatformInvitationService } from './platform.invitation.service';

@InstrumentResolver()
@Resolver()
export class PlatformInvitationResolverMutations {
  constructor(
    private authorizationService: AuthorizationService,
    private platformInvitationService: PlatformInvitationService
  ) {}

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
